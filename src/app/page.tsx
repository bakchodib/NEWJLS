
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, Landmark, ShieldCheck, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card as ShadCard, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import '@/components/ui/CardSwap.css';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);
  
  if (loading || user) {
     return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="text-lg font-semibold">Loading...</div>
      </div>
    );
  }

  const features = [
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'Customer Management',
      description: 'Easily register, view, and manage your entire customer base with detailed KYC information.',
    },
    {
      icon: <Landmark className="h-8 w-8 text-primary" />,
      title: 'Loan Processing',
      description: 'Streamline loan applications, approvals, and disbursals with our intuitive workflow.',
    },
    {
      icon: <Wallet className="h-8 w-8 text-primary" />,
      title: 'EMI Collection',
      description: 'Track and collect monthly EMIs with automated schedules and payment logging.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Secure & Reliable',
      description: 'Built on a robust and secure platform to keep your financial data safe and accessible.',
    }
  ];

  const testimonials = [
      {
          name: 'Ramesh Kumar',
          role: 'Finance Manager',
          quote: 'This platform has revolutionized how we manage our loan portfolio. The EMI tracking is a lifesaver!',
          avatar: 'RK'
      },
      {
          name: 'Sunita Sharma',
          role: 'Field Agent',
          quote: 'Collecting EMIs has never been easier. I can see all my pending collections for the month in one place.',
          avatar: 'SS'
      }
  ]

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground overflow-x-hidden">
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
        {/* Part 1: Hero Section */}
        <section className="relative w-full h-[calc(100vh-4rem)] flex items-center justify-center">
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
                <div className="z-10 text-left">
                    <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                        Empowering Rural Finance
                    </h1>
                    <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
                        A complete solution for microfinance institutions to manage customers, loans, and collections with ease and efficiency.
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
                <div className="relative h-[500px] w-full hidden md:flex items-center justify-center">
                    <CardSwap width={400} height={320} cardDistance={50} verticalDistance={60} delay={4000}>
                        <Card customClass="bg-primary text-primary-foreground p-6 flex flex-col justify-center items-center text-center">
                          <Landmark className="h-16 w-16 mb-4"/>
                          <h3 className="text-2xl font-bold">Micro Loans</h3>
                          <p className="mt-2 text-primary-foreground/80">Easy and fast disbursal of small loans to empower local communities.</p>
                        </Card>
                        <Card customClass="bg-secondary text-secondary-foreground p-6 flex flex-col justify-center items-center text-center">
                          <Wallet className="h-16 w-16 mb-4"/>
                          <h3 className="text-2xl font-bold">Savings Accounts</h3>
                           <p className="mt-2 text-secondary-foreground/80">Encourage financial discipline with secure savings options.</p>
                        </Card>
                        <Card customClass="bg-accent text-accent-foreground p-6 flex flex-col justify-center items-center text-center">
                          <ShieldCheck className="h-16 w-16 mb-4"/>
                          <h3 className="text-2xl font-bold">Insurance</h3>
                           <p className="mt-2 text-accent-foreground/80">Provide a safety net with micro-insurance for health and life.</p>
                        </Card>
                    </CardSwap>
                </div>
            </div>
        </section>

        {/* Part 2: How It Works Section */}
        <section id="how-it-works" className="py-20 bg-muted/40">
             <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">Get Started in 3 Easy Steps</h2>
                    <p className="text-lg text-muted-foreground mt-2">A seamless workflow from start to finish.</p>
                </div>
                <div className="relative">
                    <div className="hidden md:block absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2"></div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-16">
                        <div className="flex flex-col items-center text-center z-10 p-6 bg-background rounded-lg shadow-md">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl border-4 border-background mb-4">1</div>
                            <h3 className="text-xl font-semibold mb-2">Register Customers</h3>
                            <p className="text-muted-foreground">Quickly add new customers with all necessary KYC documents and details.</p>
                        </div>
                        <div className="flex flex-col items-center text-center z-10 p-6 bg-background rounded-lg shadow-md">
                           <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl border-4 border-background mb-4">2</div>
                            <h3 className="text-xl font-semibold mb-2">Disburse Loans</h3>
                            <p className="text-muted-foreground">Create and manage loan applications, get approvals, and disburse funds.</p>
                        </div>
                        <div className="flex flex-col items-center text-center z-10 p-6 bg-background rounded-lg shadow-md">
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary text-primary-foreground font-bold text-2xl border-4 border-background mb-4">3</div>
                            <h3 className="text-xl font-semibold mb-2">Collect EMIs</h3>
                            <p className="text-muted-foreground">Follow a clear schedule to collect monthly payments and track your progress.</p>
                        </div>
                    </div>
                </div>
            </div>
        </section>

        {/* Part 3: Features Section */}
        <section id="features" className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold">Powerful Features, Simple Interface</h2>
              <p className="text-lg text-muted-foreground mt-2">Everything you need to run your finance business efficiently.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                <ShadCard key={index} className="text-center shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                  <CardHeader>
                    <div className="mx-auto bg-primary/10 rounded-full p-4 w-fit mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle>{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </ShadCard>
              ))}
            </div>
          </div>
        </section>

         {/* Part 4: Testimonials Section */}
        <section id="testimonials" className="py-20 bg-muted/40">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold">Trusted by Finance Professionals</h2>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-4xl mx-auto">
                    {testimonials.map((testimonial, index) => (
                        <ShadCard key={index} className="bg-background">
                            <CardContent className="pt-6">
                                <p className="italic text-muted-foreground">"{testimonial.quote}"</p>
                                <div className="flex items-center mt-4">
                                    <Avatar className="h-12 w-12 mr-4">
                                        <AvatarFallback>{testimonial.avatar}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <p className="font-semibold">{testimonial.name}</p>
                                        <p className="text-sm text-muted-foreground">{testimonial.role}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </ShadCard>
                    ))}
                </div>
            </div>
        </section>

        {/* Part 5: Final CTA */}
        <section id="cta" className="py-20">
            <div className="container mx-auto px-4 text-center">
                <h2 className="text-3xl md:text-4xl font-bold">Ready to Transform Your Business?</h2>
                <p className="text-lg text-muted-foreground mt-2 max-w-2xl mx-auto">Take control of your finances with a platform built for efficiency and growth.</p>
                <div className="mt-8">
                     <Button asChild size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg transform hover:scale-105 transition-transform duration-300">
                        <Link href="/login">
                          Get Started Now
                          <ArrowRight className="ml-2" />
                        </Link>
                    </Button>
                </div>
            </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="container mx-auto px-4 py-6 text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} JLS FINACE LTD. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
