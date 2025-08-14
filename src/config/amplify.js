import { Amplify } from 'aws-amplify';
Amplify.configure({
  API: {
    endpoints: [
      {
        name: 'trafficAPI',
        endpoint: process.env.NEXT_PUBLIC_API_URL || 'https://main.ddwo4j04n8ass.amplifyapp.com/',
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
      }
    ]
  }
});
