import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin, Globe, ExternalLink } from 'lucide-react';

const Footer = forwardRef<HTMLElement>((props, ref) => {
  return (
    <motion.footer
      ref={ref}
      className="w-full py-8 px-4 border-t border-border/50 mt-auto bg-gradient-to-t from-background/80 to-transparent backdrop-blur-sm"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="max-w-4xl mx-auto text-center">
        {/* Developer name with website link */}
        <motion.a
          href="https://www.neetesh.tech"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-lg font-semibold text-primary hover:text-primary/80 transition-all duration-300 group mb-2"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="relative">
            Developed by{' '}
            <span className="text-gradient font-bold">Neetesh</span>
            <span className="absolute -bottom-1 left-0 w-full h-0.5 bg-primary/50 scale-x-0 group-hover:scale-x-100 transition-transform origin-left" />
          </span>
          <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.a>
        
        <p className="text-sm text-muted-foreground mb-4">
          Full-Stack Developer & AI Engineer
        </p>
        
        {/* Social links */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <motion.a
            href="https://www.neetesh.tech"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-sm text-primary hover:bg-primary/20 hover:border-primary/50 transition-all duration-300"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Globe className="w-4 h-4" />
            <span className="font-medium">neetesh.tech</span>
          </motion.a>
          
          <motion.a
            href="https://github.com/neetesh1541"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </motion.a>
          
          <motion.a
            href="https://linkedin.com/in/neetesh-kumar-846616287"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/50 border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-all duration-300"
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
          >
            <Linkedin className="w-4 h-4" />
            <span>LinkedIn</span>
          </motion.a>
        </div>
        
        <p className="text-xs text-muted-foreground/70">
          © {new Date().getFullYear()} Neetesh. All rights reserved.
        </p>
      </div>
    </motion.footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
