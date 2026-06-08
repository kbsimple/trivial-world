import { PlayerColor } from '../../constants/categories';
import { Question } from '../../types/game';

/**
 * Placeholder question interface for Phase 1 testing
 * Real question system with no-repeat tracking comes in Phase 3
 */
export interface PlaceholderQuestion {
  category: PlayerColor;
  questionText: string;
  answerText: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

/**
 * Placeholder questions for Phase 1 testing
 * 2-3 questions per category (18 total)
 * Real question loading deferred to Phase 3
 */
export const PLACEHOLDER_QUESTIONS: PlaceholderQuestion[] = [
  // Blue: The World Outside (Geography, landmarks, anime settings)
  {
    category: 'blue',
    questionText: 'What is the capital city of Japan, known for its mix of modern and traditional architecture?',
    answerText: 'Tokyo',
    difficulty: 'easy',
  },
  {
    category: 'blue',
    questionText: 'In the anime "Attack on Titan", what are the three walls that protect humanity called?',
    answerText: 'Wall Maria, Wall Rose, and Wall Sheena (Wall Sina)',
    difficulty: 'medium',
  },
  {
    category: 'blue',
    questionText: 'Which famous landmark in India was built by Mughal Emperor Shah Jahan as a tomb for his wife?',
    answerText: 'Taj Mahal',
    difficulty: 'easy',
  },

  // Pink: Pop Culture & Streaming (Streamers, memes, Marvel, YouTubers)
  {
    category: 'pink',
    questionText: 'What is the real name of the streamer known as "Pokimane"?',
    answerText: 'Imane Anys',
    difficulty: 'medium',
  },
  {
    category: 'pink',
    questionText: 'In the Marvel Cinematic Universe, what is the name of Thor\'s hammer?',
    answerText: 'Mjolnir',
    difficulty: 'easy',
  },
  {
    category: 'pink',
    questionText: 'Which YouTuber became famous for "Minecraft" videos and later won multiple Kids\' Choice Awards?',
    answerText: 'PewDiePie (Felix Kjellberg)',
    difficulty: 'easy',
  },

  // Yellow: Milestones & Myths (Tech history, ancient warriors, battles)
  {
    category: 'yellow',
    questionText: 'In what year did Apple release the first iPhone?',
    answerText: '2007',
    difficulty: 'easy',
  },
  {
    category: 'yellow',
    questionText: 'Which ancient warrior queen of the Iceni tribe led a revolt against Roman rule in Britain?',
    answerText: 'Boudica',
    difficulty: 'medium',
  },
  {
    category: 'yellow',
    questionText: 'What famous battle in 1066 resulted in the Norman conquest of England?',
    answerText: 'Battle of Hastings',
    difficulty: 'easy',
  },

  // Purple: Animation and Artwork (Comics, graphic novels, artists)
  {
    category: 'purple',
    questionText: 'What is the real name of the superhero Batman?',
    answerText: 'Bruce Wayne',
    difficulty: 'easy',
  },
  {
    category: 'purple',
    questionText: 'Which Japanese animation studio created "Spirited Away" and "My Neighbor Totoro"?',
    answerText: 'Studio Ghibli',
    difficulty: 'easy',
  },
  {
    category: 'purple',
    questionText: 'What is the name of the fictional metal alloy that makes up Wolverine\'s skeleton and claws?',
    answerText: 'Adamantium',
    difficulty: 'medium',
  },

  // Green: Tech, Space & Logic (AI, astronomy, apex predators)
  {
    category: 'green',
    questionText: 'What is the largest planet in our solar system?',
    answerText: 'Jupiter',
    difficulty: 'easy',
  },
  {
    category: 'green',
    questionText: 'What type of AI is designed to simulate human conversation through text or voice?',
    answerText: 'Chatbot or Conversational AI',
    difficulty: 'easy',
  },
  {
    category: 'green',
    questionText: 'What is the only big cat that cannot roar but can purr continuously?',
    answerText: 'Cheetah',
    difficulty: 'medium',
  },

  // Orange: Sports & Gaming (Pro sports, college sports, esports)
  {
    category: 'orange',
    questionText: 'How many points is a touchdown worth in American football?',
    answerText: '6 points',
    difficulty: 'easy',
  },
  {
    category: 'orange',
    questionText: 'Which country has won the most FIFA World Cup titles?',
    answerText: 'Brazil (5 titles)',
    difficulty: 'medium',
  },
  {
    category: 'orange',
    questionText: 'In professional League of Legends, which team won the 2023 World Championship?',
    answerText: 'T1 (formerly SK Telecom T1)',
    difficulty: 'hard',
  },
];

/**
 * Get a random placeholder question
 * @param category - Optional category filter. If provided, returns random question from that category.
 *                   If not provided, returns random question from all categories.
 * @returns A random placeholder question
 */
export function getRandomQuestion(category?: PlayerColor): PlaceholderQuestion {
  let pool = PLACEHOLDER_QUESTIONS;

  if (category) {
    pool = pool.filter(q => q.category === category);
  }

  // Simple Math.random() selection - no repeat tracking in Phase 1
  const index = Math.floor(Math.random() * pool.length);
  return pool[index];
}