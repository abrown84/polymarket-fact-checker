import { motion, useSpring, useTransform } from "framer-motion";
import { useEffect } from "react";

interface AnimatedNumberProps {
  value: number;
  format?: (n: number) => string;
  className?: string;
}

export function AnimatedNumber({ value, format, className }: AnimatedNumberProps) {
  const spring = useSpring(0, { 
    stiffness: 100, 
    damping: 30,
    mass: 1
  });
  
  const display = useTransform(spring, (current) => {
    const rounded = Math.round(current);
    return format ? format(rounded) : rounded.toLocaleString();
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}

interface AnimatedPercentProps {
  value: number;
  decimals?: number;
  className?: string;
}

export function AnimatedPercent({ value, decimals = 1, className }: AnimatedPercentProps) {
  const spring = useSpring(0, { 
    stiffness: 100, 
    damping: 30 
  });
  
  const display = useTransform(spring, (current) => {
    return `${(current * 100).toFixed(decimals)}%`;
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{display}</motion.span>;
}




