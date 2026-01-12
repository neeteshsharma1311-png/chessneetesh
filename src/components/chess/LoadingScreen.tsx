import { motion } from 'framer-motion';

const chessPieces = ['♔', '♕', '♖', '♗', '♘', '♙'];

export const LoadingScreen = () => {
  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center z-50">
      <div className="animated-bg">
        <div className="orb-1" />
        <div className="orb-2" />
      </div>

      <motion.div
        className="relative w-32 h-32 mb-8"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
      >
        {chessPieces.map((piece, index) => (
          <motion.div
            key={index}
            className="absolute text-4xl"
            style={{ left: '50%', top: '50%' }}
            initial={{ x: '-50%', y: '-50%', rotate: index * 60 }}
            animate={{ rotate: [index * 60, index * 60 + 360] }}
            transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" } }}
          >
            <motion.span
              className="block text-primary"
              style={{ transform: `translateY(-50px) rotate(-${index * 60}deg)` }}
              animate={{ rotate: [0, -360] }}
              transition={{ rotate: { duration: 3, repeat: Infinity, ease: "linear" } }}
            >
              {piece}
            </motion.span>
          </motion.div>
        ))}

        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-5xl text-primary"
          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        >
          ♚
        </motion.div>
      </motion.div>

      <motion.h1
        className="text-3xl md:text-4xl font-bold text-gradient mb-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        Chess Master
      </motion.h1>

      <motion.div
        className="w-64 h-1 bg-secondary rounded-full overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <motion.div
          className="h-full bg-primary"
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </motion.div>

      <motion.p
        className="text-muted-foreground mt-4 text-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>
          Preparing your game...
        </motion.span>
      </motion.p>

      <motion.p
        className="absolute bottom-8 text-sm text-muted-foreground"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
      >
        Developed by{' '}
        <a href="https://www.neetesh.tech" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Neetesh
        </a>
      </motion.p>
    </div>
  );
};

export default LoadingScreen;
