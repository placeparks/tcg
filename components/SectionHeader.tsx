import React from 'react';

interface SectionHeaderProps {
  title: string;
  subtitle: string;
  centered?: boolean;
}

const SectionHeader: React.FC<SectionHeaderProps> = ({ title, subtitle, centered = false }) => {
  return (
    <div className={`mb-16 ${centered ? 'text-center' : 'text-left'}`}>
      <h2 className="text-neon-blue font-mono text-sm tracking-[0.5em] uppercase mb-2 flex items-center gap-4 justify-center md:justify-start">
        <span className="w-8 h-[1px] bg-neon-blue"></span>
        {subtitle}
        <span className={`w-8 h-[1px] bg-neon-blue ${centered ? 'block' : 'hidden md:block'}`}></span>
      </h2>
      <h3 className="font-display text-4xl md:text-5xl font-bold text-white uppercase tracking-tighter">
        {title}
      </h3>
    </div>
  );
};

export default SectionHeader;