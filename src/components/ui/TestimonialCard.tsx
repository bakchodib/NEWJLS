
import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';

interface TestimonialCardProps {
  name: string;
  handle: string;
  avatar: string;
  testimonial: string;
}

const TestimonialCard: React.FC<TestimonialCardProps> = ({ name, handle, avatar, testimonial }) => {
  return (
    <div className="flex-shrink-0 w-[320px] bg-card/80 border border-border/20 backdrop-blur-sm rounded-xl p-6 flex flex-col justify-between shadow-lg mx-4">
      <p className="text-card-foreground/90 text-base mb-6 h-full">{testimonial}</p>
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={avatar} alt={name} data-ai-hint="person" />
          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-semibold text-card-foreground">{name}</p>
          <p className="text-sm text-muted-foreground">{handle}</p>
        </div>
      </div>
    </div>
  );
};

export default TestimonialCard;
