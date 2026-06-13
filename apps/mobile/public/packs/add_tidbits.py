#!/usr/bin/env python3
"""Add tidbits to existing pack questions and recompute checksums/sizes."""

import json
import hashlib
import os
import shutil

PACKS_DIR = os.path.dirname(os.path.abspath(__file__))
DIST_PACKS_DIR = os.path.join(PACKS_DIR, '../../dist/packs')
INDEX_PATH = os.path.join(PACKS_DIR, '../api/v1/packs.json')

NEW_PACKS = [
    '5th-grade-grade-school-curriculum-a1b2c3d4.json',
    '7th-grade-grade-school-curriculum-b2c3d4e5.json',
    '9th-grade-grade-school-curriculum-c3d4e5f6.json',
    'fundamentals-of-exercise-nutrition-and-health-d4e5f6a7.json',
]

# Tidbits to add keyed by pack filename and question id
TIDBITS = {
    'american-history-1700s-dadd53ef.json': {
        'blue-001': 'The Boston Tea Party took place on December 16, 1773, when colonists dumped 342 chests of East India Company tea into Boston Harbor.',
        'blue-002': 'The Proclamation of 1763 aimed to avoid conflicts between colonists and Native Americans, but many colonists ignored it.',
        'blue-003': 'The Intolerable Acts were passed in response to the Boston Tea Party and included closing Boston Harbor until the tea was paid for.',
        'blue-004': 'Patrick Henry delivered his famous "Give me liberty, or give me death!" speech in March 1775 at the Second Virginia Convention.',
        'blue-005': 'The Battle of Bunker Hill (actually fought on Breed\'s Hill) showed that colonial militia could stand up to professional British soldiers.',
        'pink-001': 'Thomas Paine\'s Common Sense sold about 500,000 copies in its first year — an extraordinary number for a population of just 2.5 million.',
        'pink-002': 'The Declaration was primarily written by Thomas Jefferson over about 17 days in June 1776.',
        'pink-003': 'Most signers of the Declaration were lawyers, merchants, or planters — relatively wealthy and educated men.',
        'pink-004': 'Washington\'s crossing of the Delaware on Christmas night 1776 led to surprise victories at Trenton and Princeton.',
        'pink-005': 'Valley Forge (1777–78) was a turning point where Friedrich von Steuben drilled the Continental Army into a more professional fighting force.',
        'yellow-001': 'Benjamin Franklin was 70 years old when he signed the Declaration of Independence, making him the oldest signer.',
        'yellow-002': 'The Constitutional Convention met in secret — windows were nailed shut in summer heat to keep deliberations confidential.',
        'yellow-003': 'Alexander Hamilton wrote 51 of the 85 Federalist Papers, making it his most prolific literary project.',
        'yellow-004': 'The Bill of Rights was ratified on December 15, 1791, adding the first 10 amendments to the Constitution.',
        'yellow-005': 'The term "Midnight Judges" refers to appointments John Adams made the night before Jefferson\'s inauguration.',
        'purple-001': 'Gilbert Stuart\'s unfinished portrait of Washington (the "Athenaeum portrait") became the most reproduced portrait in American history and appears on the dollar bill.',
        'purple-002': 'Phillis Wheatley was the first African American and one of the first American women to publish a book of poetry.',
        'purple-003': 'The Liberty Bell cracked sometime in the 19th century; it had already been recast twice since its arrival from England in 1752.',
        'purple-004': 'The Great Seal of the United States was approved by Congress on June 20, 1782, and took six years and three committees to finalize.',
        'purple-005': '"Yankee Doodle" was originally a British song meant to mock American colonists; colonists adopted it defiantly as their own.',
        'green-001': 'The triangular trade linked Europe, Africa, and the Americas; enslaved Africans were traded for sugar, tobacco, and rum.',
        'green-002': 'Continental currency depreciated so severely that the phrase "not worth a Continental" became a common expression.',
        'green-003': 'France\'s entry into the Revolutionary War in 1778 transformed it into a global conflict stretching to India and the Caribbean.',
        'green-004': 'The Northwest Ordinance of 1787 is considered one of the most significant acts of the Continental Congress — it established a framework for admitting new states.',
        'green-005': 'Jay\'s Treaty was deeply unpopular; mobs burned John Jay in effigy and Alexander Hamilton was stoned while trying to defend it.',
        'orange-001': 'George Rogers Clark\'s 1779 capture of Fort Sackville in present-day Indiana helped secure the Old Northwest for the United States.',
        'orange-002': 'The Whiskey Rebellion of 1794 was the first major test of federal authority; Washington personally led troops — the only sitting president to command in the field.',
        'orange-003': 'The XYZ Affair referred to the three unnamed French agents who demanded bribes before diplomatic talks, sparking public outrage in the U.S.',
        'orange-004': 'The Louisiana Purchase doubled the size of the United States for about 3 cents per acre.',
        'orange-005': 'The Lewis and Clark Expedition traveled roughly 8,000 miles round-trip from 1804 to 1806.',
    },
    'trivial-world-starter-7f3a9c2e.json': {
        'blue-001': 'Canada has the longest coastline of any country in the world, stretching over 202,000 km.',
        'blue-002': 'The Sahara Desert spans 11 countries and is roughly the size of the contiguous United States.',
        'blue-003': 'The Amazon River discharges about 20% of all fresh water that flows into the world\'s oceans.',
        'blue-004': 'The Great Wall of China stretches over 13,000 miles when including all its branches and sections.',
        'blue-005': 'Antarctica is technically a desert — it receives very little precipitation annually.',
        'pink-001': 'The first video game to feature Mario was Donkey Kong (1981), where he was called "Jumpman."',
        'pink-002': 'Netflix was founded in 1997 as a DVD mail-rental service before pivoting to streaming in 2007.',
        'pink-003': 'The Marvel Cinematic Universe is the highest-grossing film franchise in history, surpassing $30 billion in box office revenue.',
        'pink-004': 'YouTube was founded in February 2005 and acquired by Google just 18 months later for $1.65 billion.',
        'pink-005': 'Minecraft has sold over 238 million copies across all platforms, making it the best-selling video game of all time.',
        'yellow-001': 'The Great Pyramids of Giza were built with such precision that the sides of the Great Pyramid are aligned almost exactly to the cardinal directions.',
        'yellow-002': 'The Roman Empire, at its peak, connected approximately 20% of the world\'s population under one government.',
        'yellow-003': 'The Black Death in the 14th century killed an estimated one-third to one-half of Europe\'s population.',
        'yellow-004': 'The Wright Brothers\' first powered flight at Kitty Hawk lasted only 12 seconds and covered 120 feet.',
        'yellow-005': 'Neil Armstrong\'s famous quote was likely a miscommunication — he intended to say "one small step for a man."',
        'purple-001': 'The Mona Lisa is painted on a poplar wood panel, not canvas, and is smaller than most people expect — about 30 by 21 inches.',
        'purple-002': 'Shakespeare invented over 1,700 words that we still use today, including "bedroom," "lonely," and "generous."',
        'purple-003': 'The first comic book superhero is generally considered to be Superman, who debuted in Action Comics #1 in 1938.',
        'purple-004': 'The Louvre in Paris is the world\'s most visited art museum, welcoming about 9 million visitors per year.',
        'green-001': 'A teaspoon of neutron star material would weigh about 10 million tons — roughly the weight of Mount Everest.',
        'green-002': 'DNA was first identified in 1869, but its double-helix structure wasn\'t discovered until Watson and Crick\'s work in 1953.',
        'green-003': 'The Internet was originally developed as ARPANET in 1969, funded by the U.S. Department of Defense.',
        'green-004': 'Octopuses have three hearts, blue blood, and can change color despite being colorblind.',
        'green-005': 'The human brain generates about 20 watts of power — enough to power a dim light bulb.',
        'orange-001': 'Michael Jordan was cut from his high school varsity basketball team as a sophomore.',
        'orange-002': 'The first modern Olympic Games were held in Athens, Greece in 1896 with 241 athletes from 14 nations.',
        'orange-003': 'Babe Ruth started his career as a pitcher for the Boston Red Sox before becoming a legendary home run hitter for the Yankees.',
        'orange-004': 'Soccer (association football) is the most-watched sport in the world, with an estimated 3.5 billion fans globally.',
        'orange-005': 'The Super Bowl is consistently the most-watched annual television broadcast in the United States.',
    },
    'diary-of-a-wimpy-kid-2722b331.json': {
        'blue-001': 'The Diary of a Wimpy Kid series has sold over 250 million copies worldwide and been translated into 65 languages.',
        'blue-002': 'Jeff Kinney originally wrote Diary of a Wimpy Kid as a webcomic on Funbrain.com starting in 2004 before it became a book.',
        'blue-003': 'Greg Heffley\'s school is set in a fictional town in the northeastern United States.',
        'pink-001': 'Rowley\'s father is portrayed as overprotective and often disapproves of Greg\'s influence on his son.',
        'pink-002': 'The "Cheese Touch" is one of the most iconic elements of the series — touching a piece of cheese on the blacktop gives you the "touch" until you pass it to someone else.',
        'pink-003': 'Rodrick\'s band is named "Löded Diper" — a purposely misspelled name that reflects his personality.',
        'yellow-001': 'Jeff Kinney spent about 8 years writing and refining the original Diary of a Wimpy Kid before it was published as a book in 2007.',
        'yellow-002': 'The books are written in a diary/journal format with Greg\'s handwritten-style text and simple stick-figure illustrations.',
        'yellow-003': 'The first Diary of a Wimpy Kid film was released in 2010, with Zachary Gordon playing Greg Heffley.',
        'purple-001': 'Jeff Kinney was a computer-game designer before becoming a full-time author and still works on game projects.',
        'purple-002': 'The illustrations in the books are meant to look like a kid\'s drawings, which Kinney deliberately keeps simple.',
        'green-001': 'The book series has inspired a long-running musical adaptation that has toured the United States.',
        'green-002': 'Greg\'s journal is described as a "diary" even though he insists it\'s not — he calls it a journal to seem less childish.',
        'orange-001': 'Rowley is portrayed as more innocent and childlike than Greg, which often creates comedic contrast between the two friends.',
        'orange-002': 'The wrestling storyline in various books parodies the exaggerated showmanship of professional wrestling.',
    },
    'alpine-ski-slopes-26180b72.json': {
        'blue-001': 'The Alps span eight countries: France, Switzerland, Italy, Monaco, Liechtenstein, Austria, Germany, and Slovenia.',
        'blue-002': 'Chamonix hosted the first Winter Olympics in 1924, making it a historic landmark in alpine skiing history.',
        'blue-003': 'Verbier, Switzerland sits at over 1,500 meters elevation, giving it reliable snowfall from November through April.',
        'blue-004': 'Val Thorens in France is the highest ski resort in the Alps at 2,300 meters, with skiing possible into May.',
        'blue-005': 'Innsbruck, Austria has hosted the Winter Olympics twice — in 1964 and 1976.',
        'pink-001': 'The FIS Alpine Ski World Cup circuit was established in 1966 and features events across Europe, North America, and occasionally Asia.',
        'pink-002': 'Lindsey Vonn holds the record for the most World Cup wins by a female alpine skier with 82 victories.',
        'pink-003': 'Mikaela Shiffrin surpassed Ingemar Stenmark\'s all-time World Cup win record in 2023, earning over 90 victories.',
        'pink-004': 'The Hahnenkamm downhill race in Kitzbühel, Austria is considered the most challenging race on the men\'s circuit.',
        'pink-005': 'Giant slalom gates are wider than slalom gates — typically 4–8 meters wide versus 0.75 meters for slalom.',
        'yellow-001': 'Skiing as a sport dates back thousands of years; ancient skis have been found in Norway and Russia dated to around 6000 BCE.',
        'yellow-002': 'The modern ski binding that releases during a fall was developed in the 1950s, dramatically reducing leg injuries.',
        'yellow-003': 'Ski boots evolved from leather lace-up boots to the rigid plastic shell design in the 1960s, improving control significantly.',
        'yellow-004': 'Snowplowing (the "pizza" shape for beginners) was the dominant braking technique taught before parallel skiing became standard.',
        'yellow-005': 'Moguls form naturally when many skiers make turns in the same spots, pushing snow into mounds over time.',
        'purple-001': 'The iconic bright colors of ski gear emerged in the 1980s when synthetic materials replaced wool and made bold dyeing easy.',
        'purple-002': 'Après-ski culture — socializing after skiing — is especially prominent in Austrian and Swiss resorts like St. Anton.',
        'purple-003': 'The ski lift was invented in Sun Valley, Idaho in 1936, inspired by banana-loading conveyors on cargo ships.',
        'purple-004': 'Snowcats (tracked vehicles used for grooming) can cost over $500,000 each and operate through the night to prepare slopes.',
        'purple-005': 'Modern ski helmets meet EN 1077 or ASTM F2040 safety standards and are designed to absorb impact at speeds up to 25 mph.',
        'green-001': 'At high speeds, alpine skiers generate G-forces in turns similar to those experienced by fighter jet pilots — up to 3G.',
        'green-002': 'Piste grooming machines mix compressed snow with water to create a firm, consistent surface for racing.',
        'green-003': 'Modern carbon-fiber ski poles are engineered to flex slightly on impact, reducing wrist strain during high-speed turns.',
        'green-004': 'Altitude sickness can affect skiers above 2,500 meters — symptoms include headache, nausea, and fatigue.',
        'green-005': 'UV radiation increases about 10–12% for every 1,000 meters of elevation, making sunscreen essential on ski slopes.',
        'orange-001': 'The downhill event is the fastest alpine skiing discipline, with top racers exceeding 150 km/h (93 mph).',
        'orange-002': 'Slalom courses feature 55–75 gates for men and 40–60 gates for women, requiring rapid short-radius turns.',
        'orange-003': 'The combined event in alpine skiing merges a downhill run with one or two slalom runs, rewarding all-around ability.',
        'orange-004': 'A ski race course inspection (called "inspection") allows athletes to side-slip down the course slowly to memorize the line.',
        'orange-005': 'Ski racing suits are aerodynamically tested in wind tunnels and can shave tenths of a second off race times.',
    },
    'year-of-2025-a2025e00.json': {
        'blue-2025-001': 'The fires that ravaged parts of Los Angeles in January 2025 burned through some of the wealthiest and most densely populated areas of Southern California.',
        'blue-2025-002': 'The 2025 Rugby World Cup was hosted across multiple cities to accommodate the global growth of the sport.',
        'blue-2025-003': 'Global plastic pollution became a major 2025 policy focus following a UN treaty negotiation effort that ran into political obstacles.',
        'pink-2025-001': 'The Oscars in early 2025 drew record viewership as several independently produced films competed with major studio releases.',
        'pink-2025-002': 'Several major streaming platforms announced price increases in 2025 while simultaneously launching ad-supported tiers.',
        'pink-2025-003': 'Sabrina Carpenter\'s 2024 album "Short n\' Sweet" continued to dominate streaming charts well into 2025.',
        'yellow-2025-001': 'The first half of 2025 saw significant AI regulation efforts across the European Union following the AI Act\'s phase-in.',
        'yellow-2025-002': 'Pope Francis passed away in April 2025 at the age of 88, ending one of the longest papal reigns of the modern era.',
        'yellow-2025-003': 'The 2025 Israeli-Hamas ceasefire agreement was brokered with mediation from Qatar, Egypt, and the United States.',
        'purple-2025-001': 'Several major video game studios announced delays in 2025 as developers pushed back releases to improve quality.',
        'purple-2025-002': 'AI-generated art tools continued to spark debate in 2025 over copyright and the role of human creativity.',
        'purple-2025-003': 'Grand Theft Auto VI was one of the most anticipated game releases of 2025, following years of fan speculation.',
        'green-2025-001': 'In 2025, several countries announced next-generation nuclear power plants using small modular reactor (SMR) technology.',
        'green-2025-002': 'Quantum computing milestones in 2025 brought commercial applications closer but remained largely experimental.',
        'green-2025-003': 'Starship\'s fully successful orbital test flights in late 2024 set the stage for ambitious 2025 mission planning by SpaceX.',
        'orange-2025-001': 'The 2025 NBA season featured several franchise-player trades that reshuffled the competitive landscape of the league.',
        'orange-2025-002': 'College sports in 2025 were reshaped by NIL (Name, Image, Likeness) deals that turned top recruits into millionaires before turning pro.',
        'orange-2025-003': 'The 2026 FIFA World Cup, to be hosted jointly by the U.S., Canada, and Mexico, was heavily discussed in 2025 as preparations accelerated.',
    },
    'one-piece-c1c1p1ec.json': {
        'blue-op-001': 'Eiichiro Oda was inspired by the manga Dragonball and pirate manga When They Cry when creating One Piece.',
        'blue-op-002': 'The Grand Line is said to be so dangerous that most pirates who enter either die or become legends.',
        'blue-op-003': 'Fish-Man Island sits 10,000 meters below the ocean surface — deeper than the real-world Mariana Trench.',
        'blue-op-004': 'Laugh Tale (formerly "Raftel" in early translations) can only be reached after finding all four Poneglyphs that lead there.',
        'blue-op-005': 'The Red Line is a massive continent that circles the globe, dividing the seas and creating the Grand Line\'s unusual geography.',
        'pink-op-001': 'Shanks is unusual among Yonko in that he became a powerful pirate without a Devil Fruit — relying purely on Haki.',
        'pink-op-002': 'Nami\'s orange tangerine grove is deeply personal — it was her way of remembering and honoring her adoptive mother Bellemere.',
        'pink-op-003': 'Sanji\'s dream of finding the All Blue (a sea where all four oceans meet) mirrors his identity as a chef — a place with every ingredient.',
        'pink-op-004': 'Chopper\'s "Monster Point" transformation uses the Human-Human Fruit Model: Ancient Giant (Zoan awakening).',
        'pink-op-005': 'Robin can sprout limbs on any surface she touches, not just her own body, making her one of the most tactically versatile Straw Hats.',
        'yellow-op-001': 'The Void Century is a 100-year gap in world history that the World Government has erased — the Poneglyphs are the only surviving records.',
        'yellow-op-002': 'Gol D. Roger\'s last words before his execution inspired a new age of piracy — the beginning of the "Great Pirate Era."',
        'yellow-op-003': 'Dressrosa was the longest arc in One Piece at the time of its airing, spanning over 100 anime episodes.',
        'yellow-op-004': 'The Celestial Dragons (Tenryubito) are descendants of the 20 kings who founded the World Government 800 years ago.',
        'yellow-op-005': 'Whitebeard\'s dying words — confirming the existence of the One Piece — sparked the "second pirate age" in the story.',
        'purple-op-001': 'Eiichiro Oda has said One Piece will end within a few more years, as he has the final chapter already planned out.',
        'purple-op-002': 'The art style of One Piece is known for its exaggerated proportions and highly expressive facial designs, which Oda has kept consistent for 25+ years.',
        'purple-op-003': 'One Piece\'s anime adaptation began in 1999 and remains one of the longest-running anime series in history.',
        'purple-op-004': 'Oda is famous for hiding foreshadowing in the artwork decades before the payoff, sometimes visible only in background panels.',
        'purple-op-005': 'The Straw Hat crew\'s jolly roger features the iconic straw hat in the skull — designed by Oda to immediately reflect Luffy\'s personality.',
        'green-op-001': 'Haki is divided into three main types: Observation, Armament, and Conqueror\'s — only a rare few can use Conqueror\'s Haki.',
        'green-op-002': 'Logia Devil Fruits grant elemental body transformation but are countered by Haki or sea water.',
        'green-op-003': 'The Will of D. (the "D." initial carried by characters like Luffy, Roger, and Ace) remains one of the story\'s greatest unsolved mysteries.',
        'green-op-004': 'Vegapunk\'s research into Devil Fruits and Seastone has made him the world\'s most valuable scientist in the One Piece universe.',
        'green-op-005': 'Gear Fifth transforms Luffy\'s rubber body to match the nature of the Sun God Nika — a Zoan awakening disguised as a Paramecia.',
        'orange-op-001': 'The Davy Back Fight is a pirate game tradition where crews compete for each other\'s crew members or the Jolly Roger.',
        'orange-op-002': 'Usopp\'s alter ego "Sogeking" was created because he couldn\'t emotionally confront his decision to leave the crew during Water 7.',
        'orange-op-003': 'Zoro uses a unique three-sword style (Santoryu) — including one sword held in his mouth — that he developed himself.',
        'orange-op-004': 'The Corrida Colosseum arc in Dressrosa featured dozens of fighters competing for the Mera Mera no Mi (Ace\'s former fruit).',
        'orange-op-005': 'Brook\'s violin and music abilities are not just for entertainment — sound-based attacks are a core part of his combat style.',
    },
    'young-sheldon-6ac4973a.json': {
        'blue-001': 'East Texas, where Young Sheldon is set, is characterized by its conservative culture, religious communities, and distinct regional identity.',
        'blue-002': 'Medford, Texas (Sheldon\'s fictional hometown) is depicted as a small town where everyone knows each other and Sheldon stands out dramatically.',
        'blue-003': 'The University of East Texas (fictional) in the show is based loosely on real East Texas universities like UT Tyler.',
        'pink-001': 'Jim Parsons narrates Young Sheldon as the adult Sheldon looking back, directly connecting it to The Big Bang Theory timeline.',
        'pink-002': 'The show is set in 1989–1993, requiring meticulous period-accurate props, clothing, and pop culture references.',
        'pink-003': 'Georgie Cooper, Sheldon\'s older brother, runs a tire shop as an adult in The Big Bang Theory — his early entrepreneurial instincts are shown in Young Sheldon.',
        'yellow-001': 'Young Sheldon premiered in 2017 and ran for 7 seasons, concluding in 2024 with Sheldon leaving for Caltech.',
        'yellow-002': 'Iain Armitage was 9 years old when he began playing young Sheldon, and his performance was praised for capturing Jim Parsons\'s mannerisms.',
        'yellow-003': 'The show filmed in California but carefully recreated the look of 1980s–90s Texas through set design and location shoots.',
        'purple-001': 'Montana Jordan, who plays Georgie, became one of the show\'s most popular characters despite being introduced as a secondary figure.',
        'purple-002': 'The Cooper family\'s home set is designed to feel authentically middle-class 1980s American with period-accurate decor.',
        'purple-003': 'Meemaw (Connie Tucker) is portrayed as the fun-loving, gambling, sometimes morally ambiguous counterpoint to Sheldon\'s structured worldview.',
        'green-001': 'Sheldon\'s early interest in train schedules and precise time management shown in the series foreshadows his adult obsession with routine in The Big Bang Theory.',
        'green-002': 'The series shows Sheldon\'s early experiments with physics including his "Cooper Coupler" train experiment.',
        'green-003': 'Dr. Sturgis (Sheldon\'s early mentor at the university) represents the kind of brilliant-but-socially-awkward role model Sheldon aspires to be.',
        'orange-001': 'George Cooper Sr.\'s football coaching career is central to the show — his relationship with Sheldon provides the main emotional arc of the series.',
        'orange-002': 'Sheldon\'s distaste for sports, especially football, contrasts sharply with his father\'s deep passion for coaching, creating ongoing family tension.',
        'orange-003': 'The show accurately depicts the cultural dominance of high school football in Texas, where Friday night games are community events.',
    },
    'youtube-streams-b7b0b001.json': {
        'blue-yt-001': 'YouTube was founded in February 2005 by three former PayPal employees: Chad Hurley, Steve Chen, and Jawed Karim.',
        'blue-yt-002': 'The YouTube Play Buttons are milestone awards given to creators: Silver (100K), Gold (1M), Diamond (10M), and Red Diamond (100M).',
        'blue-yt-003': 'MrBeast (Jimmy Donaldson) grew his channel through increasingly expensive stunts and philanthropy, becoming one of the highest-earning YouTubers.',
        'blue-yt-004': 'YouTube Shorts launched globally in 2021 as a response to TikTok\'s short-form video dominance.',
        'blue-yt-005': 'PewDiePie held the title of most-subscribed individual creator on YouTube for years before T-Series (a music label) surpassed him.',
        'pink-yt-001': 'The term "Let\'s Play" for gaming commentary videos became popularized on YouTube in the late 2000s and spawned its own genre.',
        'pink-yt-002': 'ASMR videos generate tingles through soft sounds like whispering and tapping — the genre exploded on YouTube after 2010.',
        'pink-yt-003': 'Unboxing videos became a YouTube sensation around 2006 and remain popular for tech, toys, and luxury goods.',
        'pink-yt-004': 'YouTube\'s "reaction video" genre involves creators filming themselves watching other content — it\'s been both hugely popular and legally controversial.',
        'pink-yt-005': 'The Vlog Squad, associated with David Dobrik, was one of the most-watched YouTube collectives in the late 2010s.',
        'yellow-yt-001': 'YouTube\'s first viral video was "Me at the zoo" — uploaded by co-founder Jawed Karim in April 2005.',
        'yellow-yt-002': 'The "Charlie bit my finger" video (2007) was one of the earliest viral sensations, eventually selling as an NFT for nearly $761,000 in 2021.',
        'yellow-yt-003': 'YouTube removed its dislike count from public view in 2021, citing creator mental health concerns.',
        'yellow-yt-004': 'The YouTube Partner Program (YPP), which allows creators to monetize, launched in 2007 and transformed content creation into a career.',
        'yellow-yt-005': 'Gangnam Style by PSY was the first YouTube video to reach 1 billion views in 2012, and later the first to reach 2 billion.',
        'purple-yt-001': 'YouTube thumbnails are a micro-art form — creators employ graphic designers specifically to optimize click-through rates.',
        'purple-yt-002': 'YouTube\'s auto-generated captions use machine learning and can produce unintentionally humorous mistranscriptions called "autocaption fails."',
        'purple-yt-003': 'The YouTube "end screen" feature allows creators to promote other videos or channels during the final 5–20 seconds of a video.',
        'purple-yt-004': 'Lo-fi hip hop streams became a YouTube phenomenon with their iconic "study girl" animation, which streams live 24/7.',
        'purple-yt-005': 'YouTube\'s algorithm favors watch time and click-through rate over raw view counts when recommending videos.',
        'green-yt-001': 'YouTube uses a Content ID system that scans uploaded videos against a database of copyrighted material to automatically flag or monetize matches.',
        'green-yt-002': 'Over 500 hours of video are uploaded to YouTube every minute as of the mid-2020s.',
        'green-yt-003': 'YouTube\'s recommendation algorithm has been studied extensively for its role in "rabbit holes" — progressively leading users to more extreme content.',
        'green-yt-004': 'YouTube Premium, launched in 2018, offers ad-free viewing and background play for a monthly subscription fee.',
        'green-yt-005': 'YouTube\'s servers store an almost incomprehensible amount of data — estimates place the archive at over 1 exabyte (1 billion gigabytes).',
        'orange-yt-001': 'Sidemen FC, a YouTube creator football club, has played charity matches drawing tens of thousands of live spectators and millions of online viewers.',
        'orange-yt-002': 'The KSI vs. Logan Paul boxing matches in 2018 and 2019 demonstrated the crossover appeal of YouTube creators to sports audiences.',
        'orange-yt-003': 'YouTube has hosted exclusive coverage of major sports events including UEFA Champions League matches and NFL games.',
        'orange-yt-004': 'Dude Perfect, known for trick shot videos and sports challenges, has over 60 million subscribers and tours arenas for live shows.',
        'orange-yt-005': 'YouTube gaming streams compete directly with Twitch, with creators like Ludwig and Valkyrae making high-profile platform switches.',
    },
}

def compute_checksum(questions: list) -> str:
    compact = json.dumps(questions, separators=(',', ':'), ensure_ascii=False)
    return hashlib.sha256(compact.encode('utf-8')).hexdigest()

def compute_size(questions: list) -> int:
    compact = json.dumps(questions, separators=(',', ':'), ensure_ascii=False)
    return len(compact.encode('utf-8'))

def add_tidbits_to_pack(filename: str, tidbits: dict) -> tuple:
    """Returns (new_checksum, new_size)."""
    filepath = os.path.join(PACKS_DIR, filename)
    with open(filepath, 'r', encoding='utf-8') as f:
        pack = json.load(f)

    updated = 0
    new_questions = []
    for q in pack['questions']:
        qid = q['id']
        new_q = {
            'id': q['id'],
            'category': q['category'],
            'difficulty': q['difficulty'],
            'questionText': q['questionText'],
            'answerText': q['answerText'],
        }
        if qid in tidbits:
            new_q['tidbits'] = tidbits[qid]
            updated += 1
        elif 'tidbits' in q:
            new_q['tidbits'] = q['tidbits']
        new_questions.append(new_q)

    pack['questions'] = new_questions
    new_checksum = compute_checksum(new_questions)
    new_size = compute_size(new_questions)
    pack['checksum'] = new_checksum
    pack['size'] = new_size

    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(pack, f, indent=2, ensure_ascii=False)

    print(f"  {filename}: updated {updated} questions, checksum={new_checksum[:12]}…, size={new_size}")
    return new_checksum, new_size

def copy_new_pack(filename: str) -> tuple:
    """Copy a new pack from dist/packs/ to public/packs/, promoting checksum/size to top level."""
    src = os.path.join(DIST_PACKS_DIR, filename)
    dst = os.path.join(PACKS_DIR, filename)
    with open(src, 'r', encoding='utf-8') as f:
        pack = json.load(f)
    # Recompute checksum from questions (consistent with other packs)
    checksum = compute_checksum(pack['questions'])
    size = compute_size(pack['questions'])
    pack['checksum'] = checksum
    pack['size'] = size
    with open(dst, 'w', encoding='utf-8') as f:
        json.dump(pack, f, indent=2, ensure_ascii=False)
    print(f"  Copied {filename}: checksum={checksum[:12]}…, size={size}")
    return checksum, size

def update_index(pack_updates: dict, new_pack_entries: list):
    """pack_updates: {filename: (checksum, size)}, new_pack_entries: list of index entry dicts."""
    with open(INDEX_PATH, 'r', encoding='utf-8') as f:
        index = json.load(f)

    for entry in index['packs']:
        url = entry.get('downloadUrl', '')
        fname = url.split('/')[-1]
        if fname in pack_updates:
            checksum, size = pack_updates[fname]
            entry['checksum'] = checksum
            entry['size'] = size
            print(f"  index updated: {fname}")

    # Add new pack entries
    for entry in new_pack_entries:
        index['packs'].append(entry)
        print(f"  index added: {entry['id']}")

    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        json.dump(index, f, indent=2, ensure_ascii=False)

def build_new_pack_entries() -> list:
    entries = []
    new_pack_meta = [
        {
            'id': 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
            'filename': '5th-grade-grade-school-curriculum-a1b2c3d4.json',
            'name': '5th Grade Grade School Curriculum',
            'description': 'Test your knowledge of what every 5th grader should know — from world geography and American history to science, art, and sports.',
            'version': '1.0.0',
        },
        {
            'id': 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
            'filename': '7th-grade-grade-school-curriculum-b2c3d4e5.json',
            'name': '7th Grade Grade School Curriculum',
            'description': 'Middle school knowledge challenge covering world history, science, literature, health, and the arts for 7th graders.',
            'version': '1.0.0',
        },
        {
            'id': 'c3d4e5f6-a7b8-9012-cdef-123456789012',
            'filename': '9th-grade-grade-school-curriculum-c3d4e5f6.json',
            'name': '9th Grade Grade School Curriculum',
            'description': 'High school entry-level knowledge spanning modern history, literature, biology, chemistry, geometry, and physical fitness.',
            'version': '1.0.0',
        },
        {
            'id': 'd4e5f6a7-b8c9-0123-def0-234567890123',
            'filename': 'fundamentals-of-exercise-nutrition-and-health-d4e5f6a7.json',
            'name': 'Fundamentals of Exercise, Nutrition, and Health',
            'description': 'From macronutrients and muscle anatomy to athletic performance and wellness culture — a deep dive into health science.',
            'version': '1.0.0',
        },
    ]
    for meta in new_pack_meta:
        fname = meta['filename']
        src = os.path.join(DIST_PACKS_DIR, fname)
        with open(src, 'r', encoding='utf-8') as f:
            pack = json.load(f)
        category_counts = {}
        for q in pack['questions']:
            cat = q['category']
            category_counts[cat] = category_counts.get(cat, 0) + 1
        checksum = compute_checksum(pack['questions'])
        size = compute_size(pack['questions'])
        entries.append({
            'id': meta['id'],
            'name': meta['name'],
            'description': meta['description'],
            'author': 'Trivial World Team',
            'version': meta['version'],
            'totalQuestions': len(pack['questions']),
            'categoryCounts': category_counts,
            'downloadUrl': f"https://trivial-world.netlify.app/packs/{fname}",
            'checksum': checksum,
            'size': size,
        })
    return entries

def main():
    print("Adding tidbits to existing packs in public/packs/...")
    pack_updates = {}
    for filename, tidbits in TIDBITS.items():
        print(f"\nProcessing {filename}:")
        checksum, size = add_tidbits_to_pack(filename, tidbits)
        pack_updates[filename] = (checksum, size)

    print("\nCopying new packs from dist/packs/ to public/packs/...")
    new_pack_entries = build_new_pack_entries()
    for filename in NEW_PACKS:
        copy_new_pack(filename)

    print("\nUpdating public pack index...")
    update_index(pack_updates, new_pack_entries)
    print("\nDone.")

if __name__ == '__main__':
    main()
