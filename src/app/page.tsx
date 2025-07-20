
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  // Don't render anything until we know the user is not logged in.
  if (loading || user) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-background to-blue-50 dark:from-slate-900 dark:to-slate-800 text-foreground">
      <header className="sticky top-0 z-50 flex items-center justify-between h-16 px-4 md:px-8 border-b bg-background/80 backdrop-blur-sm">
        <Link href="/" className="flex items-center gap-2 font-bold text-lg">
          <Briefcase className="h-6 w-6 text-primary" />
          <span>JLS FINACE LTD</span>
        </Link>
        <div className="flex items-center gap-4">
          <Button asChild>
            <Link href="/login">
              Login
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative flex flex-col items-center justify-center text-center min-h-[calc(100vh-4rem)] px-4 py-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(46,71,101,0.1),rgba(255,255,255,0))]"></div>
          
          <div 
            className="absolute top-1/2 left-1/2 h-64 w-64 md:h-96 md:w-96 bg-primary/20 rounded-full blur-3xl animate-blob"
            style={{ animationDelay: '0s' }}
            ></div>
          <div 
            className="absolute top-1/2 left-1/2 h-64 w-64 md:h-96 md:w-96 bg-accent/20 rounded-full blur-3xl animate-blob animation-delay-2000"
            style={{ animationDelay: '2s' }}
            ></div>
           <div 
            className="absolute top-1/2 left-1/2 h-64 w-64 md:h-96 md:w-96 bg-destructive/10 rounded-full blur-3xl animate-blob animation-delay-4000"
            style={{ animationDelay: '4s' }}
            ></div>

          <div className="z-10 max-w-4xl">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-primary">
              The Future of Financial Management
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Streamline your loan management, from application to collection, with a powerful and intuitive platform designed for growth.
            </p>
            <div className="mt-10">
              <Button asChild size="lg" className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg transform hover:scale-105 transition-transform duration-300">
                <Link href="/login">
                  Access Your Dashboard
                  <ArrowRight className="ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

       <style jsx>{`
        .animate-blob {
          animation: blob 7s infinite;
        }
        @keyframes blob {
          0% {
            transform: translate(-50%, -50%) scale(1);
          }
          33% {
            transform: translate(-40%, -60%) scale(1.1);
          }
          66% {
            transform: translate(-60%, -40%) scale(0.9);
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
          }
        }
        .animation-delay-2000 {
            animation-delay: 2s;
        }
        .animation-delay-4000 {
            animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}
