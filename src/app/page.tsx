
'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Briefcase, Landmark, ShieldCheck, Users, Wallet } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CardSwap, { Card } from '@/components/ui/CardSwap';
import '@/components/ui/CardSwap.css';
import SplitText from '@/components/ui/SplitText';
import Aurora from '@/components/ui/Aurora';
import StarBorder from '@/components/ui/StarBorder';
import TestimonialCard from '@/components/ui/TestimonialCard';
import '@/components/ui/TestimonialMarquee.css';
import AnimatedCounter from '@/components/ui/AnimatedCounter';


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
      image: 'https://placehold.co/600x400.png',
      hint: 'customers analytics'
    },
    {
      icon: <Landmark className="h-8 w-8 text-primary" />,
      title: 'Loan Processing',
      description: 'Streamline loan applications, approvals, and disbursals with our intuitive workflow.',
      image: 'https://placehold.co/600x400.png',
      hint: 'loan application'
    },
    {
      icon: <Wallet className="h-8 w-8 text-primary" />,
      title: 'EMI Collection',
      description: 'Track and collect monthly EMIs with automated schedules and payment logging.',
      image: 'https://placehold.co/600x400.png',
      hint: 'finance payment'
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Secure & Reliable',
      description: 'Built on a robust and secure platform to keep your financial data safe and accessible.',
      image: 'https://placehold.co/600x400.png',
      hint: 'data security'
    }
  ];

  const testimonials1 = [
    {
      name: 'Lavneet',
      handle: '@lavneet',
      avatar: 'https://placehold.co/48x48.png',
      testimonial: "This platform has revolutionized how we manage our loan portfolio. The EMI tracking is a lifesaver!"
    },
    {
      name: 'Sunita Sharma',
      handle: '@sunitasharma',
      avatar: 'https://placehold.co/48x48.png',
      testimonial: "Collecting EMIs has never been easier. I can see all my pending collections for the month in one place."
    },
    {
      name: 'Amit Singh',
      handle: '@amitsingh',
      avatar: 'https://placehold.co/48x48.png',
      testimonial: "The UI is so intuitive and easy to use. Onboarding new agents is a breeze now. Highly recommended."
    },
    {
      name: 'Priya Patel',
      handle: '@priyapatel',
      avatar: 'https://placehold.co/48x48.png',
      testimonial: "The PDF generation for loan agreements is a huge time-saver for us. Professional and quick."
    }
  ];

   const testimonials2 = [
    {
      name: 'Jitendra',
      handle: '@jitendra',
      avatar: 'https://placehold.co/48x48.png',
      testimonial: "The dashboard gives a fantastic overview of our operations. We can track overdue EMIs in real-time."
    },
    {
      name: 'Sandeep',
      handle: '@sandeep',
      avatar: 'https://placehold.co/48x48.png',
      testimonial: "As a small business owner, getting a loan was quick and the process was very transparent. Love it!"
    },
    {
      name: 'Deepak Kumar',
      handle: '@deepakk',
      avatar: 'https://placehold.co/48x48.png',
      testimonial: "Secure, reliable, and has all the features we need. It's the perfect tool for microfinance."
    },
    {
      name: 'Neha Gupta',
      handle: '@nehagupta',
      avatar: 'https://placehold.co/48x48.png',
      testimonial: "I'm really impressed with the top-up loan functionality. It's seamless and easy to manage."
    }
  ];

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
            <Aurora
              colorStops={["#A386F5", "#C4ADFF", "#3366CC"]}
              blend={0.5}
              amplitude={0.5}
            />
            <div className="container mx-auto px-4 grid md:grid-cols-2 gap-8 items-center">
                <div className="z-10 text-left">
                     <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter text-primary">
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
                <div className="relative h-[400px] w-full hidden md:flex items-center justify-center">
                    <CardSwap width={300} height={250} cardDistance={50} verticalDistance={60} delay={4000}>
                        <Card customClass="bg-card text-card-foreground p-6 flex flex-col justify-center items-center text-center">
                          <Landmark className="h-12 w-12 mb-4 text-primary"/>
                          <h3 className="text-xl font-bold">
                             <SplitText text="Micro Loans" splitType='chars' delay={50} />
                          </h3>
                           <SplitText text="Fast disbursal of small loans to empower communities." splitType='words' delay={30} className="mt-2 text-sm text-card-foreground/80" />
                        </Card>
                        <Card customClass="bg-card text-card-foreground p-6 flex flex-col justify-center items-center text-center">
                          <Wallet className="h-12 w-12 mb-4 text-primary"/>
                          <h3 className="text-xl font-bold">
                             <SplitText text="Savings" splitType='chars' delay={50} />
                          </h3>
                           <SplitText text="Encourage financial discipline with secure savings options." splitType='words' delay={30} className="mt-2 text-sm text-card-foreground/80" />
                        </Card>
                        <Card customClass="bg-card text-card-foreground p-6 flex flex-col justify-center items-center text-center">
                          <ShieldCheck className="h-12 w-12 mb-4 text-primary"/>
                          <h3 className="text-xl font-bold">
                            <SplitText text="Insurance" splitType='chars' delay={50} />
                          </h3>
                           <SplitText text="Provide a safety net with micro-insurance for health and life." splitType='words' delay={30} className="mt-2 text-sm text-card-foreground/80" />
                        </Card>
                    </CardSwap>
                </div>
            </div>
        </section>

        {/* Part 2: Stats Section (Replaces "How It Works") */}
        <section id="stats" className="py-20 bg-muted/20">
             <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="p-8 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg border border-border/20 flex flex-col justify-center items-start">
                        <div className="text-8xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                           <AnimatedCounter to={100} suffix="%" />
                        </div>
                        <h3 className="text-2xl font-semibold mt-2">Streamlined Operations</h3>
                        <p className="text-muted-foreground mt-1">Fully digital workflow for maximum efficiency.</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       <div className="p-8 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg border border-border/20 flex flex-col justify-center">
                            <div className="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                               <AnimatedCounter to={3} />
                            </div>
                            <h3 className="text-xl font-semibold mt-2">User Roles</h3>
                            <p className="text-muted-foreground mt-1">Admin, Agent, and Customer access levels.</p>
                       </div>
                       <div className="p-8 bg-card/80 backdrop-blur-sm rounded-lg shadow-lg border border-border/20 flex flex-col justify-center">
                            <div className="text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
                               <AnimatedCounter to={500} suffix="+" />
                            </div>
                            <h3 className="text-xl font-semibold mt-2">Happy Customers</h3>
                            <p className="text-muted-foreground mt-1">Join our growing community.</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((feature, index) => (
                 <StarBorder key={index} className="h-full">
                    <div className="flex flex-col items-center text-center justify-center h-full p-6">
                      <div className="mx-auto bg-primary/20 rounded-full p-3 w-fit mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="text-lg font-bold">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground mt-2">{feature.description}</p>
                    </div>
                 </StarBorder>
              ))}
            </div>
          </div>
        </section>

        {/* Part 4: Testimonials Section */}
        <section id="testimonials" className="py-20 bg-muted/20 relative">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold">Loved by Finance Professionals</h2>
              <p className="text-lg text-muted-foreground mt-2">See what our partners are saying about us.</p>
            </div>
          </div>
          <div className="relative flex flex-col gap-8 overflow-hidden">
            <div className="marquee">
              <div className="marquee-group">
                {[...testimonials1, ...testimonials1].map((testimonial, index) => (
                  <TestimonialCard key={`t1-${index}`} {...testimonial} />
                ))}
              </div>
            </div>
            <div className="marquee marquee-reverse">
              <div className="marquee-group">
                {[...testimonials2, ...testimonials2].map((testimonial, index) => (
                  <TestimonialCard key={`t2-${index}`} {...testimonial} />
                ))}
              </div>
            </div>
             <div className="absolute inset-0 bg-gradient-to-r from-muted/20 via-transparent to-muted/20 pointer-events-none"></div>
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
