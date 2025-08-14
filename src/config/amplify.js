import { Amplify } from 'aws-amplify';
Amplify.configure({
  API: {
    endpoints: [
      {
        name: 'trafficAPI',
        endpoint: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000',
        region: process.env.NEXT_PUBLIC_AWS_REGION || 'us-east-1'
      }
    ]
  }
});