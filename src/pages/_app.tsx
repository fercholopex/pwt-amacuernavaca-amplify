import '@/styles/variables.css';  
import '@/styles/globals.css';    
import '@/styles/animations.css';
import { AppProps } from 'next/app';
import { AuthProvider } from '../components/AuthContext';

function MyApp({ Component, pageProps }: AppProps) {
    // Debug environment variables
    if (process.env.NODE_ENV === 'development') {
        console.log('Environment Variables:', {
            DB_HOST: process.env.DB_HOST,
            NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL
        });
    }
    
    return (
        <AuthProvider>
            <div className="app-container">
                <Component {...pageProps} />
            </div>
        </AuthProvider>
    );
}

export default MyApp;
