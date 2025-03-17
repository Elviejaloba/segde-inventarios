import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

interface LoadingMascotProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function LoadingMascot({ message = "Cargando...", size = "md" }: LoadingMascotProps) {
  const sizes = {
    sm: "h-24 w-24",
    md: "h-32 w-32",
    lg: "h-40 w-40"
  };

  return (
    <div className="flex flex-col items-center justify-center gap-4">
      <div className="relative">
        {/* Cute robot mascot SVG */}
        <motion.svg
          viewBox="0 0 100 100"
          className={sizes[size]}
          initial="hidden"
          animate="visible"
        >
          {/* Head */}
          <motion.circle
            cx="50"
            cy="45"
            r="25"
            fill="#94a3b8"
            stroke="#475569"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5 }}
          />
          
          {/* Eyes */}
          <motion.circle
            cx="40"
            cy="40"
            r="5"
            fill="#0ea5e9"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.5, duration: 0.3 }}
          />
          <motion.circle
            cx="60"
            cy="40"
            r="5"
            fill="#0ea5e9"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.2, 1] }}
            transition={{ delay: 0.6, duration: 0.3 }}
          />
          
          {/* Mouth */}
          <motion.path
            d="M 40 55 Q 50 65 60 55"
            stroke="#475569"
            strokeWidth="3"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ delay: 0.7, duration: 0.5 }}
          />
          
          {/* Antenna */}
          <motion.line
            x1="50"
            y1="20"
            x2="50"
            y2="10"
            stroke="#475569"
            strokeWidth="2"
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.8, duration: 0.3 }}
          />
          <motion.circle
            cx="50"
            cy="8"
            r="3"
            fill="#0ea5e9"
            initial={{ scale: 0 }}
            animate={{ scale: 1, y: [0, -5, 0] }}
            transition={{
              scale: { delay: 0.9, duration: 0.3 },
              y: { repeat: Infinity, duration: 1, ease: "easeInOut" }
            }}
          />
        </motion.svg>
        
        {/* Loading spinner */}
        <motion.div
          className="absolute bottom-0 right-0"
          initial={{ scale: 0 }}
          animate={{ scale: 1, rotate: 360 }}
          transition={{ delay: 1, duration: 0.5 }}
        >
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </motion.div>
      </div>
      
      {message && (
        <motion.p
          className="text-lg text-muted-foreground text-center"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2 }}
        >
          {message}
        </motion.p>
      )}
    </div>
  );
}
