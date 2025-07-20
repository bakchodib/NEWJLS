'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface AnimatedCounterProps {
  to: number;
  duration?: number;
  className?: string;
  suffix?: string;
}

const AnimatedCounter = ({ to, duration = 1.5, className, suffix = '' }: AnimatedCounterProps) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const counter = { value: 0 };

    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: element,
        start: 'top 85%',
        toggleActions: 'play none none none',
        once: true,
      },
    });

    tl.to(counter, {
      duration: duration,
      value: to,
      roundProps: 'value',
      onUpdate: () => {
        element.textContent = `${counter.value}${suffix}`;
      },
      ease: 'power2.out',
    });

    return () => {
      tl.kill();
      ScrollTrigger.getAll().forEach(trigger => {
        if (trigger.trigger === element) {
          trigger.kill();
        }
      });
    };
  }, [to, duration, suffix]);

  return <span ref={ref} className={className}>0{suffix}</span>;
};

export default AnimatedCounter;
