"use client";
import { motion } from 'framer-motion';

const FadeIn = ({ children, delay = 0.2, duration = 0.5 }: { children: React.ReactNode, delay?: number, duration?: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ delay, duration, ease: "easeInOut" }}
      viewport={{ once: true, amount: 0.3 }}
    >
      {children}
    </motion.div>
  );
};
export default FadeIn;