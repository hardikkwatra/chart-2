const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Get the Verida network from environment variables
const VERIDA_NETWORK = process.env.VERIDA_NETWORK || 'testnet';
console.log(`Using Verida network: ${VERIDA_NETWORK}`);

// Define the API endpoint from environment variables
const VERIDA_API_BASE_URL = process.env.API_ENDPOINT || "https://api.verida.ai/api/rest/v1";
console.log(`Using Verida API endpoint: ${VERIDA_API_BASE_URL}`);

// Helper function for base64 encoding
function btoa(str) {
  return Buffer.from(str).toString('base64');
}

// Define schema URLs and their encoded versions
const GROUP_SCHEMA = 'https://common.schemas.verida.io/social/chat/group/v0.1.0/schema.json';
const MESSAGE_SCHEMA = 'https://common.schemas.verida.io/social/chat/message/v0.1.0/schema.json';
const GROUP_SCHEMA_ENCODED = btoa(GROUP_SCHEMA);
const MESSAGE_SCHEMA_ENCODED = btoa(MESSAGE_SCHEMA);

// Keywords to check for "Engage Bonus"
const ENGAGE_KEYWORDS = ['cluster', 'protocol', 'ai'];

// Helper function to test multiple Verida API endpoints
async function testVeridaEndpoints(authToken) {
  const endpoints = [
    '/api/profile',
    '/api/user/info',
    '/v1/user',
    '/user',
    '/profile'
  ];
  
  console.log('Testing Verida endpoints with token:', authToken.substring(0, 10) + '...');
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: 'GET',
        url: `${VERIDA_API_BASE_URL}${endpoint}`,
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      });
      
      console.log(`✅ Endpoint ${endpoint} succeeded:`, response.status);
      console.log('Response data keys:', Object.keys(response.data || {}));
      
      if (response.data?.did) {
        console.log('DID found in response:', response.data.did);
        return response.data.did;
      }
    } catch (error) {
      console.log(`❌ Endpoint ${endpoint} failed:`, error.message);
      console.log('Status:', error.response?.status);
    }
  }
  return null;
}

// Helper function to check for keywords in text content
function checkForKeywords(text, keywordMatches) {
  if (!text) return;
  
  const normalizedText = text.toLowerCase();
  
  ENGAGE_KEYWORDS.forEach(keyword => {
    // Match whole words, case insensitive
    let searchPos = 0;
    const lowerKeyword = keyword.toLowerCase();
    
    while (true) {
      const foundPos = normalizedText.indexOf(lowerKeyword, searchPos);
      if (foundPos === -1) break;
      
      // Check if it's a whole word or hashtag match
      const isWordStart = foundPos === 0 || 
        !normalizedText[foundPos-1].match(/[a-z0-9]/) || 
        normalizedText[foundPos-1] === '#';
        
      const isWordEnd = foundPos + lowerKeyword.length >= normalizedText.length || 
        !normalizedText[foundPos + lowerKeyword.length].match(/[a-z0-9]/);
      
      if (isWordStart && isWordEnd) {
        keywordMatches.keywords[keyword]++;
        keywordMatches.totalCount++;
        console.log(`Keyword match: '${keyword}' at position ${foundPos} in text: "${text.substring(Math.max(0, foundPos-10), Math.min(text.length, foundPos+keyword.length+10))}..."`);
        break; // Count each keyword only once per text
      }
      
      searchPos = foundPos + 1;
    }
  });
}

// Verida service for querying vault data
const veridaService = {
  // Get user DID using the auth token
  getUserDID: async (authToken) => {
    try {
      if (!authToken) {
        throw new Error('Auth token is required to fetch user DID');
      }

      console.log('Fetching user DID with auth token:', authToken.substring(0, 10) + '...');
      
      // Format auth header correctly
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      // Try to get user profile info 
      try {
        const profileResponse = await axios({
          method: 'GET',
          url: `${VERIDA_API_BASE_URL.replace('/api/rest/v1', '')}/api/profile`,
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/json'
          },
          timeout: 5000
        });
        
        if (profileResponse.data?.did) {
          console.log('Retrieved DID from profile:', profileResponse.data.did);
          return profileResponse.data.did;
        }
      } catch (profileError) {
        console.warn('Profile lookup failed:', profileError.message);
      }

      // As a fallback, use the default DID from .env if available
      if (process.env.DEFAULT_DID) {
        console.warn('Using DEFAULT_DID as fallback - not ideal for production');
        return process.env.DEFAULT_DID;
      }
      
      throw new Error('Could not determine user DID');
    } catch (error) {
      console.error('Error determining DID:', error.message || error);
      throw error;
    }
  },

  // Get Telegram data (groups and messages) from Verida vault
  getTelegramData: async (did, authToken) => {
    try {
      if (!authToken) {
        throw new Error('Auth token is required to query Verida vault');
      }
      
      console.log('Querying Verida with:', { did, authToken: authToken.substring(0, 10) + '...' });
      
      // Format auth header correctly
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      // Initialize counters and data stores
      let groups = 0;
      let messages = 0;
      let groupItems = [];
      let messageItems = [];
      let keywordMatches = {
        totalCount: 0,
        keywords: {}
      };
      
      // Initialize keyword counts
      ENGAGE_KEYWORDS.forEach(keyword => {
        keywordMatches.keywords[keyword] = 0;
      });
      
      // Fetch Telegram groups
      try {
        console.log('Fetching Telegram groups...');
        const groupResponse = await axios({
          method: 'POST',
          url: `${VERIDA_API_BASE_URL}/ds/query/${GROUP_SCHEMA_ENCODED}`,
          data: {
            query: {
              sourceApplication: "https://telegram.com"
            },
            options: {
              sort: [{ _id: "desc" }],
              limit: 100000
            }
          },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          timeout: 10000
        });
        
        // Process group data
        if (groupResponse.data?.items && Array.isArray(groupResponse.data.items)) {
          groupItems = groupResponse.data.items;
          groups = groupItems.length;
          console.log(`Found ${groups} Telegram groups`);
          
          // Check for keywords in group content
          groupItems.forEach(group => {
            const groupText = [
              group.name || '', 
              group.description || '',
              group.subject || ''
            ].join(' ');
            
            if (groupText.trim()) {
              checkForKeywords(groupText, keywordMatches);
            }
          });
        } else {
          console.log('No group items found in response');
          console.log('Response data keys:', Object.keys(groupResponse.data || {}));
        }
      } catch (groupError) {
        console.error('Error fetching Telegram groups:', groupError.message);
      }
      
      // Fetch Telegram messages
      try {
        console.log('Fetching Telegram messages...');
        const messageResponse = await axios({
          method: 'POST',
          url: `${VERIDA_API_BASE_URL}/ds/query/${MESSAGE_SCHEMA_ENCODED}`,
          data: {
            query: {
              sourceApplication: "https://telegram.com"
            },
            options: {
              sort: [{ _id: "desc" }],
              limit: 100000
            }
          },
          headers: {
            'Content-Type': 'application/json',
            'Authorization': authHeader
          },
          timeout: 10000
        });
        
        // Process message data
        if (messageResponse.data?.items && Array.isArray(messageResponse.data.items)) {
          messageItems = messageResponse.data.items;
          messages = messageItems.length;
          console.log(`Found ${messages} Telegram messages`);
          
          // Check for keywords in message content
          messageItems.forEach(message => {
            // Extract text content from message
            let allTextFields = [];
            
            // Add all string fields from the message object
            Object.entries(message).forEach(([key, value]) => {
              if (typeof value === 'string') {
                allTextFields.push(value);
              } else if (typeof value === 'object' && value !== null) {
                // Check nested objects (like "body" or "data")
                Object.values(value).forEach(nestedValue => {
                  if (typeof nestedValue === 'string') {
                    allTextFields.push(nestedValue);
                  }
                });
              }
            });
            
            const messageText = allTextFields.join(' ');
            
            if (messageText.trim()) {
              checkForKeywords(messageText, keywordMatches);
            }
          });
        } else {
          console.log('No message items found in response');
          console.log('Response data keys:', Object.keys(messageResponse.data || {}));
        }
      } catch (messageError) {
        console.error('Error fetching Telegram messages:', messageError.message);
      }
      
      // Return all data
      return {
        groups,
        messages,
        groupItems,
        messageItems,
        keywordMatches
      };
    } catch (error) {
      console.error('Error querying Verida vault:', error.message || error);
      throw error;
    }
  },
  
  // Get Telegram groups specifically
  getTelegramGroups: async (authToken) => {
    try {
      if (!authToken) {
        throw new Error('Auth token is required to query Verida vault');
      }
      
      // Format auth header correctly
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      console.log('Fetching Telegram groups...');
      const response = await axios({
        method: 'POST',
        url: `${VERIDA_API_BASE_URL}/ds/query/${GROUP_SCHEMA_ENCODED}`,
        data: {
          query: {
            sourceApplication: "https://telegram.com"
          },
          options: {
            sort: [{ _id: "desc" }],
            limit: 100000
          }
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        timeout: 10000
      });
      
      // Extract and return groups
      const groups = response.data && response.data.items ? response.data.items : [];
      return groups;
    } catch (error) {
      console.error('Error fetching Telegram groups:', error.message || error);
      throw error;
    }
  },
  
  // Get Telegram messages specifically
  getTelegramMessages: async (authToken) => {
    try {
      if (!authToken) {
        throw new Error('Auth token is required to query Verida vault');
      }
      
      // Format auth header correctly
      const authHeader = authToken.startsWith('Bearer ') ? authToken : `Bearer ${authToken}`;
      
      console.log('Fetching Telegram messages...');
      const response = await axios({
        method: 'POST',
        url: `${VERIDA_API_BASE_URL}/ds/query/${MESSAGE_SCHEMA_ENCODED}`,
        data: {
          query: {
            sourceApplication: "https://telegram.com"
          },
          options: {
            sort: [{ _id: "desc" }],
            limit: 100000
          }
        },
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authHeader
        },
        timeout: 10000
      });
      
      // Extract and return messages
      const messages = response.data && response.data.items ? response.data.items : [];
      return messages;
    } catch (error) {
      console.error('Error fetching Telegram messages:', error.message || error);
      throw error;
    }
  }
};

module.exports = veridaService;