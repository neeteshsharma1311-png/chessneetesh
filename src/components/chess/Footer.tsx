import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';
import { Github, Linkedin } from 'lucide-react';

const Footer = forwardRef<HTMLElement>((props, ref) => {
  return (
    <motion.footer
      className="w-full py-6 px-4 border-t border-border mt-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
    >
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-sm text-muted-foreground mb-2">
          Developed by <span className="text-primary font-semibold">Neetesh</span>
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          Full-Stack Developer & AI Engineer
        </p>
        <div className="flex items-center justify-center gap-4 mb-4">
          <a
            href="https://github.com/neetesh1541"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Github className="w-4 h-4" />
            <span>neetesh1541</span>
          </a>
          <a
            href="https://linkedin.com/in/neetesh-kumar-846616287"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <Linkedin className="w-4 h-4" />
            <span>Neetesh Kumar</span>
          </a>
        </div>
        <p className="text-xs text-muted-foreground">
          © 2025 Neetesh. All rights reserved.
        </p>
      </div>
    </motion.footer>
  );
});

Footer.displayName = 'Footer';

export default Footer;
