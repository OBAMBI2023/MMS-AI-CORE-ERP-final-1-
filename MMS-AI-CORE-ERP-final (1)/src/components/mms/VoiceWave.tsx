import { motion } from "framer-motion";

export function VoiceWave() {
  return (
    <div className="flex items-center gap-1 h-6">
      {Array.from({ length: 22 }).map((_, i) => (
        <motion.span
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-primary to-primary-glow"
          animate={{ height: ["20%", "100%", "30%", "80%", "20%"] }}
          transition={{
            duration: 1.1 + (i % 5) * 0.12,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.04,
          }}
          style={{ height: "40%" }}
        />
      ))}
    </div>
  );
}
