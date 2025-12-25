import { Helmet } from 'react-helmet-async';
import ChessGame from '@/components/chess/ChessGame';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Chess Master - Play Chess Online | PvP & AI Modes</title>
        <meta 
          name="description" 
          content="Play chess online with Chess Master. Challenge friends in local multiplayer or test your skills against AI opponents with adjustable difficulty. Features chess clock, move history, and beautiful themes." 
        />
        <meta name="keywords" content="chess, online chess, chess game, play chess, chess AI, chess multiplayer" />
        <link rel="canonical" href="https://chessmaster.app" />
      </Helmet>
      <ChessGame />
    </>
  );
};

export default Index;
