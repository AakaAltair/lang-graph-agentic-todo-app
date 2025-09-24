"use client";
import { motion } from 'framer-motion';

const AnimatedHeading = ({ text }: { text: string }) => {
  return (
    <motion.h1
      className="text-5xl md:text-7xl font-black mb-8 text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
    >
      {text.split(" ").map((word, index) => (
        <span key={index} className="inline-block mr-4">
          {word.split("").map((char, charIndex) => (
            <motion.span
              key={charIndex}
              className="inline-block"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 + (index * 0.1) + (charIndex * 0.02) }}
              viewport={{ once: true }}
            >
              {char}
            </motion.span>
          ))}
        </span>
      ))}
    </motion.h1>
  );
};
export default AnimatedHeading;
