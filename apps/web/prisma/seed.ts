import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChoiceInput {
  label: "A" | "B" | "C" | "D";
  text: string;
}

interface ChallengeInput {
  audioUrl: string;
  audioScript: string; // Full reading passage — give this to voice actors / TTS
  question: string;
  choices: ChoiceInput[];
  answer: "A" | "B" | "C" | "D";
  explanation: string;
  hint: string;
}

// Audio URL helper — replace with real Cloudinary/Vercel Blob URLs after recording
const A = (i: number, p: number, q: number) =>
  `https://assets.linguaquest.app/audio/i${i}-p${p}-q${q}.mp3`;

// ─── STORY ───────────────────────────────────────────────────────────────────
//
//  LinguaQuest: The Listening Sea
//
//  DAGAT — A Grade 7 student-sailor. Finds a torn sea chart (Mapa ng Pakikinig)
//          washed ashore in an old chest. Brave, curious, still learning.
//
//  CAPTAIN SALITA — Ancient pirate mentor. His voice was stolen by Ingay 100
//          years ago. Communicates only through written scrolls and whispers.
//          His mission: help Dagat collect all 7 Shards to regain his voice.
//
//  INGAY — Spirit of Noise and Distraction. Not purely evil — she is everything
//          that prevents true listening: speed, confusion, assumptions, noise.
//          She sabotages each island differently.
//
//  THE QUEST — 7 islands, 7 Shards of Understanding. When all 7 are assembled,
//          they form the Alingawngaw Crystal, which silences Ingay and restores
//          Captain Salita's voice.
//
//  ISLAND STORY HOOKS:
//   1 Isla ng Salita   — Ingay scrambled the villagers' words. Frozen in silence.
//   2 Isla ng Bilis    — Ingay sped up time. Everyone speaks too fast to follow.
//   3 Isla ng Diwa     — Ingay covered the island in fog. Main ideas are hidden.
//   4 Isla ng Damdamin — Ingay drained all emotion. Words are flat and lifeless.
//   5 Isla ng Tanong   — Ingay scattered the records. Names, dates, facts lost.
//   6 Isla ng Kwento   — Ingay fragmented the storytellers' memories. Narratives broken.
//   7 Isla ng Alingawngaw — Ingay's stronghold. All skills tested. Crystal assembled.
//
// ─────────────────────────────────────────────────────────────────────────────

const CHALLENGES: Record<number, Record<number, ChallengeInput[]>> = {

  // ══════════════════════════════════════════════════════════════════════════
  //  ISLAND 1 — Isla ng Salita
  //  Skill: Vocabulary in Context
  //  Setting: Pirates decoding meaning from the sea world around them.
  // ══════════════════════════════════════════════════════════════════════════
  1: {
    1: [
      {
        audioUrl: A(1, 1, 1),
        audioScript: "Dagat stepped onto Isla ng Salita for the first time, no shards in her satchel, the salt still wet on her boots. The first frozen villager she found was an old navigator — mouth open, mid-sentence, eyes fixed on a map that no longer moved. Ingay's spell had scrambled his words, but Dagat leaned close and let his fractured voice wash over her. The old navigator unrolled a remarkably elaborate map of the hidden sea. Every current was charted, every reef marked with a red warning stroke, every favorable wind illustrated with delicate arrows. The crew gathered around in silence — none of them had ever seen something so precisely and carefully drawn. She stayed with the word until the sentence around it gave her everything she needed.",
        question: "What does 'elaborate' most likely mean as used in this passage?",
        choices: [
          { label: "A", text: "Simple and easy to read" },
          { label: "B", text: "Detailed and carefully developed" },
          { label: "C", text: "Enormous in size" },
          { label: "D", text: "Difficult to understand" },
        ],
        answer: "B",
        explanation: "The map had every current, reef, and wind carefully marked. These details point to something 'elaborate' — meaning detailed and carefully developed.",
        hint: "What words describe the map? Those descriptions reveal the word's meaning.",
      },
      {
        audioUrl: A(1, 1, 2),
        audioScript: "Still on Isla ng Salita, Dagat moved deeper into the frozen village, following the sound of a voice that flickered in and out like a dying lamp. A sailor stood at the dock's edge, frozen mid-story about a voyage that had gone long and hard. Ingay had sealed the words, but Dagat listened through the static. After three weeks at sea with no port in sight, fresh water had become scarce aboard the Baybayin. The cook was rationing half a cup per sailor each day. The captain scanned the horizon from the crow's nest every hour, hoping to spot an island with a freshwater spring. What had once flowed freely from barrels now felt like gold. Dagat felt the weight of the word before she had a name for it.",
        question: "What does 'scarce' most likely mean as used in the passage?",
        choices: [
          { label: "A", text: "Dirty and unclean" },
          { label: "B", text: "Frozen and icy" },
          { label: "C", text: "Not enough; in short supply" },
          { label: "D", text: "Plentiful and overflowing" },
        ],
        answer: "C",
        explanation: "Half a cup per day, rationing, desperate searching — all signal that fresh water was extremely limited. 'Scarce' means not enough; in short supply.",
        hint: "Why was the captain scanning the horizon? What kind of problem would cause that?",
      },
    ],
    2: [
      {
        audioUrl: A(1, 2, 1),
        audioScript: "The frozen village went deeper than Dagat had expected. She found a young sailor at the far end of the market square, suspended mid-word, his hands curved as if still holding an invisible rope. He had been telling someone about a sailor named Mando — and the story pressed through Ingay's spell in fragments. Young Mando had failed his navigation test three times. The older sailors laughed and called him 'lost at sea.' But he kept going back to the star charts every night, tracing constellations with his finger until his eyes burned. Two months later, he guided the ship through the treacherous Straits of Alingaso on his own — flawlessly. The captain simply said: 'Those who persevere find their course.' Dagat whispered the last word back to herself, like a compass bearing she intended to keep.",
        question: "What does 'persevere' mean based on the story?",
        choices: [
          { label: "A", text: "To give up after repeated failure" },
          { label: "B", text: "To continue working hard despite difficulty" },
          { label: "C", text: "To ask others for help immediately" },
          { label: "D", text: "To celebrate before the journey ends" },
        ],
        answer: "B",
        explanation: "Mando failed three times but kept studying every night until he succeeded. That persistence — refusing to quit — is exactly what 'persevere' means.",
        hint: "What did Mando keep doing even after failing? That action mirrors the word's meaning.",
      },
      {
        audioUrl: A(1, 2, 2),
        audioScript: "Another frozen villager, farther along the same dock — this one a first mate, caught in the posture of grief. His back was to the road, shoulders caved inward, as if Ingay had stopped the world at his worst moment. The story seeping through was quiet and heavy. When the first mate realized the compass had gone overboard in the storm, he walked to the stern alone. He stood with his back to the crew, shoulders curved, staring at the empty sea. He did not speak at dinner. He did not join the card game as he usually did. He just stared at the horizon like a man carrying something no one else could see. Dagat watched his frozen face and felt she understood the word already — before it was spoken.",
        question: "When the passage describes the first mate as 'dejected,' what does it most likely mean?",
        choices: [
          { label: "A", text: "Excited and full of energy" },
          { label: "B", text: "Sad and deeply discouraged" },
          { label: "C", text: "Confused about the ship's direction" },
          { label: "D", text: "Angry at the storm" },
        ],
        answer: "B",
        explanation: "Standing alone at the stern, curved shoulders, refusing dinner and company — all are signs of deep sadness and defeat. That is 'dejected.'",
        hint: "What emotion fits someone who lost something important and retreated to the stern in silence?",
      },
    ],
    4: [
      {
        audioUrl: A(1, 4, 1),
        audioScript: "Ingay's hold was getting stronger here — the air near the market district crackled and hissed with interference. A group of sailors were frozen mid-gesture in a tight circle, all of them staring toward the horizon, mouths open. The story crackling through them was urgent and strange. The lookout spotted a peculiar ship drifting at the edge of the fog. It flew no flag. Its sails were patched with mismatched cloth — purple, orange, and deep green. The figurehead at the bow was carved as a crowing rooster, not the usual mermaid. Even the hull was painted in alternating black and white stripes. Every sailor on deck stopped and stared. Dagat pressed her ear toward the sound and held on to the word they kept circling back to.",
        question: "What does 'peculiar' most likely mean as used in the passage?",
        choices: [
          { label: "A", text: "Very large and powerful" },
          { label: "B", text: "Strange or unusual in a noticeable way" },
          { label: "C", text: "Fast-moving and dangerous" },
          { label: "D", text: "Familiar and ordinary" },
        ],
        answer: "B",
        explanation: "No flag, mismatched sails, a rooster figurehead, striped hull — every detail marks this ship as odd and out of the ordinary. 'Peculiar' means strange or unusual.",
        hint: "What makes this ship different from every other ship? That difference is what the word describes.",
      },
      {
        audioUrl: A(1, 4, 2),
        audioScript: "The market of Isla ng Salita was almost completely silent under Ingay's spell — only the hiss of scrambled words and the distant sound of the sea. A frozen dockworker was trying to finish an account of something that had happened to old Kulas, his expression one of bewildered sympathy. Ingay's interference crackled between each word, but Dagat stood still and listened through it. Old Kulas had been to Port Bagyo a dozen times. But that morning the fog was so thick he could barely see his own hands. He wandered the dock for an hour, utterly bewildered. He could not find the harbormaster's office, could not remember which pier the Baybayin was docked at, and was no longer sure whether the sound he heard was a bell or just the wind. The word came through with everything it needed around it.",
        question: "The passage says Kulas was 'utterly bewildered.' What does this mean?",
        choices: [
          { label: "A", text: "Completely exhausted from walking" },
          { label: "B", text: "Very angry at the fog" },
          { label: "C", text: "Thoroughly confused and disoriented" },
          { label: "D", text: "Happily surprised by the weather" },
        ],
        answer: "C",
        explanation: "'Bewildered' means confused. 'Utterly' makes it total — completely disoriented. The three things Kulas could not figure out confirm this.",
        hint: "What three things did Kulas fail to do? Those failures describe his mental state.",
      },
    ],
    5: [
      {
        audioUrl: A(1, 5, 1),
        audioScript: "The last corner of Isla ng Salita was quieter than the rest — a hushed kind of cold, as if even Ingay was holding her breath. The Vocabulary Shard was close; Dagat could feel it pulsing somewhere ahead. One more frozen storyteller stood at the village's edge — a veteran sailor, weathered and still, mid-way through a legend she had clearly told a hundred times. Ingay was pushing back hardest here. But Dagat pressed in and listened. Everyone said the eastern passage was impossible in typhoon season. The old captains refused to sail it. But young Captain Hana was tenacious. She mapped the route three times. She studied six months of wind records. She ran two test sails through the outer storm belt. On the day of the crossing, she held the wheel steady for sixteen hours straight — and brought every sailor home. The word rang out like a bell through all the noise.",
        question: "What does 'tenacious' most likely mean?",
        choices: [
          { label: "A", text: "Naturally skilled from years of training" },
          { label: "B", text: "Stubbornly reckless and dangerous" },
          { label: "C", text: "Determined and persistent no matter the difficulty" },
          { label: "D", text: "Lucky during dangerous crossings" },
        ],
        answer: "C",
        explanation: "Three maps, six months of records, two test sails, sixteen hours at the wheel — Hana refused to let difficulty stop her. 'Tenacious' means holding firmly to a goal despite all obstacles.",
        hint: "Count every extra step Hana took when others refused. That pattern is the word's meaning.",
      },
      {
        audioUrl: A(1, 5, 2),
        audioScript: "And there he was — the very last frozen villager on Isla ng Salita. Dagat recognized the face before she reached him: old Mang Berto, the island's most legendary navigator, caught mid-story near a lantern that had gone cold. Ingay had frozen him at his most alive moment. Dagat leaned close, close enough to feel the faint warmth still caught in the spell, and his voice broke through in fragments. Old Mang Berto would tell the story every night near the lantern. 'When the Alingawngaw storm hit,' he would say, 'the waves were ferocious — towering walls of black water that swallowed the horizon. Three ships were capsized in a single hour. We tied ourselves to the mast and prayed. I have sailed forty years. I have never seen the sea wear that face again.' Every young sailor listened without a word. Dagat listened the same way now — without a word — until the shard began to glow.",
        question: "What does 'ferocious' mean as used in the passage?",
        choices: [
          { label: "A", text: "Surprisingly gentle" },
          { label: "B", text: "Ice-cold and freezing" },
          { label: "C", text: "Enormous in height" },
          { label: "D", text: "Violently fierce and powerful" },
        ],
        answer: "D",
        explanation: "Towering black waves, three ships capsized, sailors tied to masts — these describe violent, uncontrollable force. That is what 'ferocious' means.",
        hint: "What did the waves DO to the ships? Those actions define the word.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ISLAND 2 — Isla ng Bilis
  //  Skill: Rapid Speech Comprehension
  //  Setting: Harbor announcements, fleet dispatches, fast-paced captain orders.
  //  NOTE: These scripts should be read FAST — like real port PA announcements.
  // ══════════════════════════════════════════════════════════════════════════
  2: {
    1: [
      {
        audioUrl: A(2, 1, 1),
        audioScript: "The Vocabulary Shard glowed in Dagat's satchel as the Baybayin dropped anchor at Isla ng Bilis. The moment her boots touched the dock, she felt it — time lurching forward at an unnatural pace, everything spoken at the speed of a panicked heart. Ingay had sped up the island's clock, and the words of every announcement blurred past like water off a tilting hull. Dagat braced herself and caught a fragment from the harbormaster's tower above: Ahoy, crew of the Baybayin! The quartermaster reminds all deckhands that rope-rigging drills will be held this Thursday and Friday — NOT Tuesday as previously posted. Report to the main deck at dawn. Bring your standard kit: gloves, harness line, and climbing hook. Sailors without full kit will not be permitted to drill. Dismissed! She held the correction in her mind like a fixed star.",
        question: "On which days are the rope-rigging drills now scheduled?",
        choices: [
          { label: "A", text: "Tuesday and Wednesday" },
          { label: "B", text: "Thursday and Friday" },
          { label: "C", text: "Friday and Saturday" },
          { label: "D", text: "Tuesday only" },
        ],
        answer: "B",
        explanation: "The announcement corrected the schedule: 'Thursday and Friday — NOT Tuesday.' The correct days are Thursday and Friday.",
        hint: "Listen for what days are stated AFTER the word 'not.'",
      },
      {
        audioUrl: A(2, 1, 2),
        audioScript: "Dagat moved through the harbor district of Isla ng Bilis, watching sailors flinch at announcements that came and went in the space of a breath. Everything on this island moved at Ingay's unnatural pace — even the dockmaster's voice streaked past like a ship in full sail. Another notice crackled through the air from the dockmaster's post, and Dagat planted her feet and listened. Port Alingawngaw dockmaster's notice! The supply depot opens weekdays — Monday through Friday — at six bells morning and closes at four bells evening. On weekends — Saturday and Sunday — the depot opens two hours later at eight bells and closes early at two bells afternoon. The depot will be fully sealed during storm warnings. Fair winds! The weekend times were the ones that mattered — she pinned them in place.",
        question: "What time does the supply depot close on weekends?",
        choices: [
          { label: "A", text: "Four bells in the evening" },
          { label: "B", text: "Two bells in the afternoon" },
          { label: "C", text: "Six bells in the evening" },
          { label: "D", text: "Eight bells in the morning" },
        ],
        answer: "B",
        explanation: "'On weekends... closes early at two bells afternoon.' The weekend closing time is two bells in the afternoon.",
        hint: "Listen specifically for 'weekends' — what closing time follows those words?",
      },
    ],
    2: [
      {
        audioUrl: A(2, 2, 1),
        audioScript: "Farther into Isla ng Bilis, Ingay's time-acceleration thickened — announcements arriving half-finished, officers mid-sprint between posts. Dagat's ears were sharper now than when she'd landed, but the blur was still fierce. She caught a fleet officer's urgent announcement as the woman ran past, words spilling at an inhuman pace. Attention all officers! The afternoon crew briefing scheduled for three bells today has been cancelled. A broken mainmast on Pier Seven requires all senior riggers to respond immediately. The briefing is rescheduled for tomorrow, same time, same location. Inform your junior deckhands. Move swiftly! Dagat caught the reason before it vanished.",
        question: "Why was the afternoon crew briefing cancelled?",
        choices: [
          { label: "A", text: "The captain was absent" },
          { label: "B", text: "The meeting room flooded" },
          { label: "C", text: "The harbormaster called for inspection" },
          { label: "D", text: "A broken mainmast required immediate attention" },
        ],
        answer: "D",
        explanation: "'A broken mainmast on Pier Seven requires all senior riggers to respond immediately.' That is the stated reason.",
        hint: "Listen for the word 'requires' — the problem stated there is the reason.",
      },
      {
        audioUrl: A(2, 2, 2),
        audioScript: "A dispatch runner on Isla ng Bilis came skidding around a corner, speaking so fast she could barely breathe between words — Ingay's time-blur at its most relentless. Dagat stepped directly into the runner's path, steadied her own breathing, and caught the fleet intelligence report mid-delivery. Breaking dispatch from the Coral Triangle lookout post: A scout vessel has identified a previously uncharted island at bearing forty-seven degrees northeast, approximately three days' sail from Port Alingawngaw. The island shows freshwater streams and timber stands. The discovery was reported by helmsman Reyes during last week's scouting run. Fleet commanders are urged to review updated sea charts immediately. The island. Northeast. Three days. She held each detail like a rope in fast water.",
        question: "What did the scout vessel discover?",
        choices: [
          { label: "A", text: "A new trade route to the west" },
          { label: "B", text: "An uncharted island to the northeast" },
          { label: "C", text: "A sunken wreck near Port Alingawngaw" },
          { label: "D", text: "An enemy fleet at bearing forty-seven" },
        ],
        answer: "B",
        explanation: "The dispatch reported: 'a previously uncharted island at bearing forty-seven degrees northeast.' The discovery was a new island.",
        hint: "What was at bearing forty-seven degrees northeast? That is what was discovered.",
      },
    ],
    4: [
      {
        audioUrl: A(2, 4, 1),
        audioScript: "Dagat was deeper into Isla ng Bilis now, and the time-blur was worse than it had been at the harbor — words piling on top of each other, syllables compressed until they were nearly unrecognizable. Ingay was fighting harder here. A harbormaster's bell notice came screaming through the air, so fast the words nearly tripped over each other, and Dagat braced against a dock post and caught what she could. Good tide, sailors! The harbormaster announces that the cannon inspection originally set for this Wednesday, the fourteenth, has been moved to next Wednesday, the twenty-first. The armory yard remains the same venue. All gunners and powder keepers must attend. Absence without signed medical leave from the ship's surgeon will be recorded. Notify your watch partners. Fair winds! The date had changed. She made herself note what had not.",
        question: "Why was the cannon inspection rescheduled?",
        choices: [
          { label: "A", text: "The venue was changed" },
          { label: "B", text: "The head gunner was injured" },
          { label: "C", text: "No reason was given — only the date changed" },
          { label: "D", text: "The harbormaster left port" },
        ],
        answer: "C",
        explanation: "The announcement said it 'has been moved' — no reason given. The venue stayed the same. When no reason is stated, that IS the answer.",
        hint: "Did the speaker explain WHY the date changed? If not, that absence of reason IS the answer.",
      },
      {
        audioUrl: A(2, 4, 2),
        audioScript: "At the supply barge on Isla ng Bilis, the quartermaster was reeling off changes at Ingay's unnatural pace — each figure arriving and disappearing before it could properly land. Dagat stood at the barge's edge and slowed her mind against the rush, letting the numbers come as they would. Attention all crew at the supply barge! Starting at next port call, ration prices have changed. A full salt-fish portion now costs two coppers. Hardtack biscuits are one copper per bundle. Fresh water flasks remain free. The daily hot stew — previously three coppers — has been reduced to two coppers. All prices effective beginning Monday. The word 'reduced' was the anchor she needed.",
        question: "How much does the daily hot stew cost under the new prices?",
        choices: [
          { label: "A", text: "Three coppers" },
          { label: "B", text: "Four coppers" },
          { label: "C", text: "One copper" },
          { label: "D", text: "Two coppers" },
        ],
        answer: "D",
        explanation: "The stew 'has been reduced to two coppers.' The new price is two coppers — three was the old price.",
        hint: "Listen for 'reduced to' — the number right after it is the new price.",
      },
    ],
    5: [
      {
        audioUrl: A(2, 5, 1),
        audioScript: "The Swift Shard was close — Dagat could feel it the way she had felt the first shard, a warmth pulling at the edge of the air. But Ingay was pouring everything into this island now, and the fleet commander's announcement was nearly unintelligible, the words compressed to a blur of urgent sound. Dagat closed her eyes, slowed her breath, and listened with everything she had. Fast news from the fleet commander! The joint fleet maneuvers originally planned for this Friday have been postponed to the following Friday. All ship positions and formations remain the same. The drill route is unchanged. Participation is required for all captains and first mates. No late arrivals will be excused. Signal your fleet neighbors. Dismissed! She caught the most important absence in the whole announcement: the reason no one gave.",
        question: "Why were the joint fleet maneuvers postponed?",
        choices: [
          { label: "A", text: "The fleet formation changed" },
          { label: "B", text: "Too many ships were unavailable" },
          { label: "C", text: "No reason was given — only the date changed" },
          { label: "D", text: "The commander was called away" },
        ],
        answer: "C",
        explanation: "The announcement only said the maneuvers 'have been postponed' — no reason given. Route and formations stayed the same.",
        hint: "Did the speaker say WHY the date moved? If nothing is stated, the answer is 'no reason given.'",
      },
      {
        audioUrl: A(2, 5, 2),
        audioScript: "The final challenge on Isla ng Bilis — and this was where Ingay almost won. The maritime report flew past in a blur so complete that even the numbers seemed to vibrate. Dagat thought of Captain Hana, whose fleet had sailed the Eastern Passage through sixteen hours of storm, and she slowed her mind the same way she imagined Hana steadying the wheel. Maritime dispatch: A new survey by the Coral Sea Navigation Council confirms that crews sailing the Eastern Passage with fewer than six hours of night watch rest perform at three times the error rate of crews resting eight or more hours. The survey tracked two hundred vessels over two full sailing seasons. Council officials recommend all fleet captains mandate minimum rest schedules before entering the passage. The number that mattered sat quiet at the center of the blur — and she caught it.",
        question: "How many hours of rest does the survey associate with better performance?",
        choices: [
          { label: "A", text: "At least five hours" },
          { label: "B", text: "At least six hours" },
          { label: "C", text: "Eight or more hours" },
          { label: "D", text: "Between nine and ten hours" },
        ],
        answer: "C",
        explanation: "The survey compared under-6-hours crews to those resting 'eight or more hours.' The better-performing group rested eight or more hours.",
        hint: "Two groups are compared. Which had fewer errors? How many hours did they rest?",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ISLAND 3 — Isla ng Diwa
  //  Skill: Main Idea and Details
  //  Setting: Captain speeches, sea legends, port wisdom, sailor debates.
  // ══════════════════════════════════════════════════════════════════════════
  3: {
    1: [
      {
        audioUrl: A(3, 1, 1),
        audioScript: "Two shards in her satchel now, and Isla ng Diwa swallowed Dagat the moment she stepped ashore — the fog was total, white and close, pressing against her skin like damp cloth. Somewhere ahead in the fog, a voice was speaking. She recognized the cadence before she understood the words: it was the old navigator she'd met frozen on Isla ng Salita, somehow here ahead of her, giving a speech to an invisible audience. She pushed through the mist and listened for the thread. Every experienced sailor knows what the young ones forget: the most dangerous thing on a ship is not the storm or the reef — it is a tired navigator. Studies from the Maritime Safety Guild show that navigators who sleep fewer than six hours make three times as many course errors. Your charts, your compass, your eyes — none of them work if the brain behind them is exhausted. Rest is not laziness. It is the foundation of safe sailing. Dagat found the main point before the fog swallowed the voice again.",
        question: "What is the main idea of this passage?",
        choices: [
          { label: "A", text: "Why navigators should study star charts more" },
          { label: "B", text: "The importance of rest for safe navigation" },
          { label: "C", text: "How to prepare for a storm at sea" },
          { label: "D", text: "Tips for choosing a reliable compass" },
        ],
        answer: "B",
        explanation: "The passage mentions charts and compasses briefly, but the entire argument centers on sleep and its consequences for navigation. Rest for safe sailing is the main point.",
        hint: "What topic does the speaker keep returning to? That is the main idea.",
      },
      {
        audioUrl: A(3, 1, 2),
        audioScript: "The fog deepened further into Isla ng Diwa, and the voice Dagat caught now belonged to a ship's captain — lecturing her crew somewhere in the white, the sound dampened and muffled by Ingay's mist. Details arrived first: names of storms, dates, geography. The main idea kept slipping beneath them. Dagat reached through the layers and followed the thread. Most sailors fear storms — and rightly so. But storms have shaped these islands as much as any calm current. The great typhoon of 1714 carved the natural harbor at Port Salita. The seasonal squalls push nutrient-rich water up from the depths, feeding the fish that feed the fleet. The Eastern Passage itself — the most direct trade route in the region — was discovered by a crew blown off course in a storm. Storms do not only destroy. Sometimes, they reveal. She let the final line land like an anchor.",
        question: "What is the main point of this passage?",
        choices: [
          { label: "A", text: "Typhoons only cause destruction and should be avoided" },
          { label: "B", text: "Storms have played an important and sometimes positive role in shaping the sea world" },
          { label: "C", text: "The Eastern Passage is the safest trade route" },
          { label: "D", text: "Sailors should welcome every storm as an opportunity" },
        ],
        answer: "B",
        explanation: "Each example — the harbor, the fish, the trade route — shows a constructive outcome from storms. Their complex, sometimes beneficial role is the main point.",
        hint: "What connects all three examples the speaker gives? That connection is the main idea.",
      },
    ],
    2: [
      {
        audioUrl: A(3, 2, 1),
        audioScript: "Still in the fog, Dagat found that the voice now belonged to the Baybayin's own captain — addressing her own crew, somewhere nearby in the white. Ingay's fog buried the point under practical details: rope counts, canvas weights, timber tallies. But Dagat listened past the numbers for what connected them all. Every season, fleets across the Listening Sea throw away enough rope, canvas, and timber to outfit five new vessels. Today I want to share three habits for the Baybayin's crew. First: before requesting new supplies, inspect what you already have. Second: repair before replacing — a sailor who can splice rope is worth twice his weight in gold. Third: repurpose what you cannot repair. Old sail canvas makes excellent cargo covers. Small changes in how we manage ship's materials add up to a large difference. Three habits. One goal. She had it.",
        question: "What is the passage mainly about?",
        choices: [
          { label: "A", text: "How to reduce supply waste on a ship" },
          { label: "B", text: "The shortage of timber in the fleet" },
          { label: "C", text: "Different ways to repair rope and canvas" },
          { label: "D", text: "Why new supplies are expensive at port" },
        ],
        answer: "A",
        explanation: "All three tips — inspect, repair, repurpose — connect to one goal: reducing waste aboard ship. That is the main idea.",
        hint: "What action does the speaker want the crew to take? That goal is the main idea.",
      },
      {
        audioUrl: A(3, 2, 2),
        audioScript: "Deeper into the fog, two voices rose from opposite directions — a debate between sailors, their words wrapping around each other as Ingay's mist tangled the sound. One said one thing, one said another, and the argument seemed to go on and on. But then one voice rose above it — clearer, steadier, aimed at the heart of the matter. Dagat listened to it alone. Some captains say new navigation tools have ruined the old art of reading stars and currents. Others say they are the future of the fleet. I say both sides are missing the point. A sextant, a compass, a new chart — these are tools. The question is not whether to use them, but whether you understand the sea well enough to know when they are right and when they are wrong. Instruments used well make better sailors. That was the point. Not which side — what lay between them.",
        question: "What is the speaker's main argument?",
        choices: [
          { label: "A", text: "Old navigation methods should replace modern instruments" },
          { label: "B", text: "Modern tools have made sailors worse at their craft" },
          { label: "C", text: "Good instruments, used with understanding, make better sailors" },
          { label: "D", text: "Sailors should only rely on star charts" },
        ],
        answer: "C",
        explanation: "The speaker acknowledges the debate but concludes: 'Instruments used well make better sailors.' That final statement is the main argument.",
        hint: "What does the speaker say at the very end? The conclusion usually holds the main argument.",
      },
    ],
    4: [
      {
        audioUrl: A(3, 4, 1),
        audioScript: "Pin 4 — the fog was at its thickest here, pressing in from all sides, Ingay working hardest to bury every clear thought under a flood of detail. Dagat could hear a port official somewhere ahead, speaking in long, careful sentences that piled fact upon fact. She slowed herself, breathed, and listened for the one thing the official kept returning to. Three years ago, a small group of island women began growing vegetables in an unused corner of Port Salita's eastern dock. What started as a side project became something larger. Today, the garden supplies fresh provisions to twelve vessels each week — reducing scurvy cases aboard ship by forty percent. Sailors from other ports have begun requesting seeds to bring home. What was once a corner of weeds has become one of the port's most valuable assets. The transformation. Start to finish. That was what the speech was really about.",
        question: "What is the main idea of this passage?",
        choices: [
          { label: "A", text: "A failed dock project that was eventually cleared away" },
          { label: "B", text: "A small garden that grew into a vital port resource" },
          { label: "C", text: "How to prevent scurvy on long sea voyages" },
          { label: "D", text: "The importance of regular dock maintenance" },
        ],
        answer: "B",
        explanation: "The passage traces the garden from a side project to a resource other ports want to replicate. Its growth and impact is the main idea.",
        hint: "Follow the story from start to finish. What did the garden become? That transformation is the main idea.",
      },
      {
        audioUrl: A(3, 4, 2),
        audioScript: "Still deep in the fog of Isla ng Diwa, a harbormaster's voice carried from somewhere near the water — a long historical account of Port Dagat's waterway, told with careful dates and species names and decade-by-decade statistics. Ingay's fog kept burying the most important point under the flood of facts. Dagat let the details wash past and listened only for the thread that connected them. The channel into Port Dagat once ran dark with bilge waste and dye from the dockside cloth works. Fish had vanished. Fishermen abandoned their boats. Then, in the 1990s, a gradual cleanup effort began. Waste controls were enforced. Industrial dumping was banned. Today, over thirty species of fish have returned to the channel. Sea birds nest along the banks once more. The channel is not fully restored — but it breathes again. Recovery — slow, real, incomplete — was the heart of it.",
        question: "What is the main point of this passage?",
        choices: [
          { label: "A", text: "Industrial activity always destroys waterways permanently" },
          { label: "B", text: "The Port Dagat channel has been fully restored to its original state" },
          { label: "C", text: "The Port Dagat channel is slowly recovering after years of cleanup" },
          { label: "D", text: "Fish cannot survive in ports used by trading vessels" },
        ],
        answer: "C",
        explanation: "The passage shows decline then recovery. 'Not fully restored — but breathing again' signals gradual, real but incomplete recovery. Option B overstates it.",
        hint: "Did the passage say 'fully restored'? Listen for 'not' — it changes the main idea.",
      },
    ],
    5: [
      {
        audioUrl: A(3, 5, 1),
        audioScript: "The Clarity Shard was close — Dagat could feel it humming somewhere beyond the thickest wall of fog she had faced yet. A fleet commander's voice reached her from the far side, each word muffled and pressed flat by Ingay's mist. She pushed toward the sound and dragged the meaning out word by word, refusing to let the fog win. Surveys show that sailors who choose their voyages freely — picking routes they genuinely want to sail — perform better, stay healthier, and remain with their fleet longer. Yet many young sailors drift to whatever ship will take them. The reasons vary: desperation for work, no knowledge of options, or simply not believing they deserve a choice. The answer is not to lecture sailors about their worth. It is to find them the voyage they cannot wait to begin. The final line landed clear as sunlight through a break in the clouds.",
        question: "What is the speaker's main argument?",
        choices: [
          { label: "A", text: "Sailors are lazy and need more discipline" },
          { label: "B", text: "Young sailors should take any available route" },
          { label: "C", text: "Helping sailors find voyages they love leads to better outcomes" },
          { label: "D", text: "Paying sailors more is the key to loyalty" },
        ],
        answer: "C",
        explanation: "The speaker ends with: 'find them the voyage they cannot wait to begin.' This is the argument.",
        hint: "What does the speaker say at the very end? That is usually where the main argument lands.",
      },
      {
        audioUrl: A(3, 5, 2),
        audioScript: "The last speech before the fog broke — and it was the hardest one yet. Dagat reached toward a Maritime Scholars' voice through what felt like a wall of white wool, the sound reduced to a near-whisper by Ingay's mist. She extended every part of her attention toward it, and the words came through slowly, one layer at a time. Research by the Maritime Scholars' Guild shows that sailors who train in traditional sea chants and oral navigation songs for two or more years develop sharper memory for sequences, better distance estimation, and stronger focus during long watches. These effects persist for the rest of their careers. Sea chant training is not entertainment — it is a core investment in how a navigator's mind works. Fleets that have cut chant training to save time may be cutting the very thing that sharpens everything else. The Clarity Shard pulsed bright the moment she had it.",
        question: "What is the speaker's main point?",
        choices: [
          { label: "A", text: "Sea chant training should be optional for experienced sailors" },
          { label: "B", text: "Sailors who know chants perform better at port festivals" },
          { label: "C", text: "Traditional sea chant training meaningfully supports a navigator's skills" },
          { label: "D", text: "Research on sea chants and memory is still inconclusive" },
        ],
        answer: "C",
        explanation: "The speaker presents evidence and concludes chant training is 'a core investment in how a navigator's mind works.' Option C captures this without overstating.",
        hint: "What does the speaker want fleet commanders to stop cutting? That thing is the main point.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ISLAND 4 — Isla ng Damdamin
  //  Skill: Emotional Tone and Inference
  //  Setting: Captain speeches, sailor letters, dock farewells, sea stories.
  // ══════════════════════════════════════════════════════════════════════════
  4: {
    1: [
      {
        audioUrl: A(4, 1, 1),
        audioScript: "Three shards now — and Isla ng Damdamin was unlike anything Dagat had faced before. The island wasn't loud or fast or foggy. It was simply flat. Every voice she heard arrived in the same grey, colorless register, as if Ingay had drained every drop of feeling from the air. A navigator's voice reached her first — the words were all there, technically correct, but something essential was missing. Dagat forced herself to listen past the surface. I've been charting this route for three weeks and I'm still not sure it's right. What if we hit the reef at low tide? What if the current shifts? I ran the numbers ten times last night and I still feel like I'm missing something. I hope this crossing works. I really do. But every time I look at the chart, I find another line I want to redraw. I just — I don't know. I really don't know. The tone was buried — but the words, she realized, carried it anyway.",
        question: "What is the overall tone of the speaker?",
        choices: [
          { label: "A", text: "Angry and bitter toward the crew" },
          { label: "B", text: "Joyful and confident about the crossing" },
          { label: "C", text: "Worried and deeply uncertain" },
          { label: "D", text: "Proud of the route they have planned" },
        ],
        answer: "C",
        explanation: "'I'm not sure,' 'what if,' 'I don't know' — these expressions of self-doubt and anxiety signal a worried, uncertain tone.",
        hint: "Listen to HOW the speaker says things. 'What if' and 'I don't know' are key emotional signals.",
      },
      {
        audioUrl: A(4, 1, 2),
        audioScript: "Another voice on Isla ng Damdamin — a sailor recounting a rough morning — arrived in the same flat, colorless register that Ingay's drain produced. The words described something that had clearly started badly and turned around, but the feeling of that turn was invisible. Dagat traced the arc of the story anyway, feeling for where it shifted. The morning started terribly. The anchor chain jammed, the bilge pump failed, and rain soaked my chart bag before I could cover it. I thought the whole day was ruined. But then my crewmate brought me dried fish and a warm blanket without saying a word, and another sailor stayed up to help me redraw the soaked charts. By the time we set sail, I realized — it wasn't such a bad day after all. Some things fix themselves, if you let your crew help. She felt the shift from bad to better — even through the drain.",
        question: "What can you infer about how the speaker feels at the END?",
        choices: [
          { label: "A", text: "Relieved that the day turned out better than expected" },
          { label: "B", text: "Still frustrated about the anchor and bilge" },
          { label: "C", text: "Completely indifferent about the crew's help" },
          { label: "D", text: "Deeply regretful about the ruined charts" },
        ],
        answer: "A",
        explanation: "The day started badly but ended with crew kindness and gratitude. 'Wasn't such a bad day after all' signals a shift from frustration to relief.",
        hint: "Compare how the speaker felt at the START vs the END. Did the mood change?",
      },
    ],
    2: [
      {
        audioUrl: A(4, 2, 1),
        audioScript: "At the port's edge on Isla ng Damdamin, a festival was frozen mid-celebration — streamers limp, drums unbeaten, the port captain mid-speech before a crowd that could no longer feel what she was saying. Under Ingay's full emotional drain, the pride in her voice was invisible. Every grand word arrived flat. Dagat stood at the back of the silent crowd and listened past the flatness for the feeling the captain was trying to make the crowd feel. This port has been running for one hundred and forty years. Captains come back from distant seas — from trading routes far beyond the horizon — just to dock here during the Alingawngaw Festival. This is not just a celebration. This is proof of who we are. Our grandfathers built these piers. Our children will sail from them. We carry their courage in our hands when we haul the rigging. We honor them every time we leave and every time we return. This harbor is ours, and we are proud. The pride was there. She found it in the words themselves.",
        question: "What feeling does the speaker most want to create in the listener?",
        choices: [
          { label: "A", text: "Guilt for abandoning the port in the past" },
          { label: "B", text: "Pride in the port's heritage and community" },
          { label: "C", text: "Fear about the port's future" },
          { label: "D", text: "Confusion about the port's history" },
        ],
        answer: "B",
        explanation: "Uplifting language about heritage, ancestors, and community — 'proof of who we are,' 'our grandfathers,' 'we are proud' — all create a sense of pride in belonging.",
        hint: "What emotion fits when someone speaks admiringly about your community's history and traditions?",
      },
      {
        audioUrl: A(4, 2, 2),
        audioScript: "A ship's log entry read aloud — a captain's quiet account of a moment of decision at sea. Under Ingay's drain, even this exchange of quiet strength sounded empty, mechanical, as if the words were just words and nothing more. Dagat closed her eyes and reached for the attitude beneath them. I told the first mate to change the heading. He said it was too late to turn. I said we had no choice. He looked at me for a long time, then nodded slowly. 'Right,' he said. 'If that's how the wind blows — it blows.' He didn't argue after that. He just took the wheel, made the correction, and said nothing more. No complaints, no second-guessing. Just quiet acceptance of the sea's decision. The posture of the first mate — that nod, that single phrase — told her everything.",
        question: "What does 'if that's how the wind blows — it blows' reveal about the first mate's attitude?",
        choices: [
          { label: "A", text: "Excitement about the new heading" },
          { label: "B", text: "Quiet acceptance of something he cannot change" },
          { label: "C", text: "Refusal to understand the problem" },
          { label: "D", text: "Eagerness to find a different route" },
        ],
        answer: "B",
        explanation: "'It blows' expresses acceptance of an unchangeable reality. He took the wheel and said nothing more — confirming quiet acceptance.",
        hint: "What does this phrase mean in a sailor's world? What attitude does accepting the wind express?",
      },
    ],
    4: [
      {
        audioUrl: A(4, 4, 1),
        audioScript: "Dagat found a training dock on Isla ng Damdamin where a captain was addressing a young sailor. Under Ingay's full emotional drain, the captain's words sounded almost cold — each sentence arriving without warmth, without the firmness that Dagat could tell was supposed to be there. She stood at the edge of the dock and listened past the flatness, reaching for the warmth she knew must exist somewhere behind the words. You dropped the anchor too late. I know. But I want you to remember something: the sailor who gets it right every time is not the one I am looking for. I am looking for the sailor who gets it wrong, goes below, figures out why, and comes back to the wheel before anyone else is awake. That is the sailor who goes somewhere. You dropped it too late. Good. Now show me what you do with that. There it was — encouragement, pressed tight under the surface, firm and alive.",
        question: "What is the overall tone of the speaker?",
        choices: [
          { label: "A", text: "Critical and disappointed in the sailor" },
          { label: "B", text: "Encouraging and challenging in a firm way" },
          { label: "C", text: "Indifferent and uncaring" },
          { label: "D", text: "Proud and celebratory" },
        ],
        answer: "B",
        explanation: "The captain acknowledges the mistake but immediately reframes it as opportunity. Firm — 'good, now show me' — but clearly motivating.",
        hint: "Is the speaker trying to discourage or motivate? What does the last sentence reveal?",
      },
      {
        audioUrl: A(4, 4, 2),
        audioScript: "An awards ceremony on Isla ng Damdamin — a fleet captain speaking before the assembled crew, the gratitude in her voice stripped to nothing by Ingay's drain. Each image she offered arrived like a flat report rather than a tribute. Dagat stood among the motionless sailors and listened for the weight that should have been there. When I look at all of you today, I don't see sailors. I see years of early mornings at the dock, of families waving from the shore, of riggers who stayed through the night to patch a sail before dawn. I see navigators who recalculated the course three times and still got us home. I see a crew who has carried each other through storms no one should have to sail through. You didn't complete this voyage alone. Every person in this harbor completed it with you. The gratitude was embedded in every image — she just had to be willing to feel it.",
        question: "What emotion is the speaker most trying to create?",
        choices: [
          { label: "A", text: "Regret for past failures" },
          { label: "B", text: "Gratitude and a sense of shared achievement" },
          { label: "C", text: "Pride in individual skill" },
          { label: "D", text: "Nostalgia for earlier voyages" },
        ],
        answer: "B",
        explanation: "Every image — early mornings, families, the navigator's extra work — points to shared effort. 'You didn't complete this voyage alone' creates collective gratitude.",
        hint: "What does 'you didn't complete this voyage alone' mean? What emotion does shared achievement create?",
      },
    ],
    5: [
      {
        audioUrl: A(4, 5, 1),
        audioScript: "The Empathy Shard was close — Dagat could feel it, a warmth at the edge of the cold drain. Ingay's power over this island was total now: even tenderness arrived without texture, even hope sounded like a ledger entry. Dagat found a letter, handwritten, that someone had been reading aloud when the drain hit them. She took it in her own hands and read the words aloud herself, trying to find the warmth beneath the emotionless voice. The letter was from a navigator named Marina — someone who sailed far, whose warmth crossed great distances through these few written lines. I am writing this from a port you may never visit. I don't know what seas you are sailing now, or what storms you are carrying. But I want you to know that the sailor who wrote these words believed in you — not the perfect crossing, not the flawless charts, not the unblemished logbook. You. The one who gets back up when the wave knocks them down. I left a little of my courage here between these lines. Take as much as you need. Dagat felt it — warmth, quiet and sure, between every line.",
        question: "What is the tone of this passage?",
        choices: [
          { label: "A", text: "Formal and instructional" },
          { label: "B", text: "Sad and full of regret" },
          { label: "C", text: "Warm, personal, and quietly hopeful" },
          { label: "D", text: "Urgent and alarming" },
        ],
        answer: "C",
        explanation: "The language is intimate — 'I am writing to you,' 'I want you to know.' The message is trust and courage. 'I left a little of my courage here' is tender and quiet.",
        hint: "Imagine receiving this message from an old sailor. How would it make you feel? That feeling matches the tone.",
      },
      {
        audioUrl: A(4, 5, 2),
        audioScript: "The final challenge of Isla ng Damdamin — and Ingay's drain reached its peak here, stripping even this moment of every feeling it deserved. The story Dagat heard was a farewell — sailors at the end of a long voyage, standing on the dock together — and it should have been bittersweet and full. Under the drain, it sounded matter-of-fact. Dagat closed her eyes and reached for the feeling beneath the flat words, refusing to let Ingay take it. The dock felt different the morning the voyage ended. No one was in a hurry to disembark. Sailors who had barely spoken for months were exchanging port addresses, helping each other with their sea bags. Someone chalked on the hull: 'We were here.' The captain had it washed off before anyone could stop her, then turned around and said, 'You'll always be here.' No one really knew what to say after that. So they just stood on the dock together, for a while. There — in the silence, in the standing together — was everything Ingay had tried to take.",
        question: "What feeling does the passage create most powerfully?",
        choices: [
          { label: "A", text: "Relief that the voyage is finally over" },
          { label: "B", text: "Excitement about the next voyage" },
          { label: "C", text: "Bittersweet emotion at the end of something meaningful" },
          { label: "D", text: "Sadness mixed with anger" },
        ],
        answer: "C",
        explanation: "Sailors connecting before parting, the chalked hull, the captain's quiet response — all create a tender, bittersweet feeling. Sad it's ending, meaningful enough to remember.",
        hint: "What did the crew do at the very end? Standing together in silence usually signals what kind of feeling?",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ISLAND 5 — Isla ng Tanong
  //  Skill: Listening for Specific Information
  //  Setting: Fleet records, harbor announcements, maritime intelligence reports.
  // ══════════════════════════════════════════════════════════════════════════
  5: {
    1: [
      {
        audioUrl: A(5, 1, 1),
        audioScript: "Four shards gleamed in Dagat's satchel as she stepped onto Isla ng Tanong. The island's air felt scattered — names darting past like startled fish, numbers floating up and dissolving before they could be caught. Ingay had jumbled everything: records, registries, facts, dates. A fleet health announcement drifted toward Dagat, and she steadied herself against a dock post and listened for the one precise number that mattered. Good tide, young crew. I'm Officer Catalan from the Fleet Health Office. According to the 1824 Maritime Sailors' Survey, one in three crew members on long voyages is considered dangerously undernourished by the halfway point. Iron deficiency affects approximately forty-two percent of sailors on journeys of six months or more. The Fleet Council recommends iron-rich provisions — especially dried legumes — at least four times per week. Start with a cup of monggo stew every other day. Two numbers, two different facts. She caught the right one.",
        question: "What percentage of sailors on long voyages are affected by iron deficiency?",
        choices: [
          { label: "A", text: "One in three" },
          { label: "B", text: "Thirty percent" },
          { label: "C", text: "Forty-two percent" },
          { label: "D", text: "Fifty percent" },
        ],
        answer: "C",
        explanation: "'Iron deficiency affects approximately forty-two percent.' Note: 'one in three' refers to undernourishment — a different statistic.",
        hint: "The speaker gives two separate numbers. Listen for which one is tied specifically to 'iron deficiency.'",
      },
      {
        audioUrl: A(5, 1, 2),
        audioScript: "The registry clerk on Isla ng Tanong was reading numbers — totals, subtotals, route breakdowns, season comparisons — while Ingay's scatter sent several wrong figures floating in the air around each correct one. Dagat planted herself in front of the clerk and listened for the specific number that answered the specific question she had been given. Good tide, fleet officers. This is the official crew registry for the current sailing season. Total registered crew across all vessels stands at one thousand two hundred forty-three sailors — six hundred eighty-two on merchant routes and five hundred sixty-one on patrol routes. Compared to last season's total of one thousand one hundred ninety-eight, we have seen an increase of forty-five sailors. Growth is projected to continue. Thank you. The increase. Not the total. The increase. She had it.",
        question: "By how many sailors did the fleet registry increase compared to last season?",
        choices: [
          { label: "A", text: "Forty-two sailors" },
          { label: "B", text: "Forty-five sailors" },
          { label: "C", text: "One thousand two hundred forty-three sailors" },
          { label: "D", text: "Six hundred eighty-two sailors" },
        ],
        answer: "B",
        explanation: "'Compared to last season, we have seen an increase of forty-five sailors.' The increase is forty-five — not the total count.",
        hint: "Listen for the word 'increase' — what number follows directly after it?",
      },
    ],
    2: [
      {
        audioUrl: A(5, 2, 1),
        audioScript: "A competition announcement on Isla ng Tanong — and Ingay's scatter meant names were flying everywhere, third place tangling with first, wrong ships attached to wrong sailors. Dagat heard a familiar name mentioned — the Baybayin — and leaned in sharply. Good tide! I am pleased to announce the results of the Fleet Navigation Challenge. We received forty-three entries this season — our highest number ever. Third place goes to helmsman Lorenzo Bautista of the Makisig. Second place goes to navigator Reina Flores of the Hamon. And first prize — and I am proud to say this — goes to junior navigator Ana Reyes of the Baybayin. Congratulations to all competitors! Her ship. First prize. She had to make sure she caught the right name and the right place — the scatter was designed to confuse exactly this.",
        question: "Who won the Fleet Navigation Challenge?",
        choices: [
          { label: "A", text: "Maria Santos" },
          { label: "B", text: "Jose Rivera" },
          { label: "C", text: "Ana Reyes" },
          { label: "D", text: "Lorenzo Bautista" },
        ],
        answer: "C",
        explanation: "'First prize goes to junior navigator Ana Reyes of the Baybayin.' The winner is Ana Reyes. Lorenzo Bautista took third — not first.",
        hint: "Names are announced in order — third, second, first. Listen for the name that follows 'first prize.'",
      },
      {
        audioUrl: A(5, 2, 2),
        audioScript: "The fleet surgeon on Isla ng Tanong was addressing a crowd gathered near the medical dock, and Ingay's scatter kept snatching the exact recommendation away before it could land cleanly. Wrong numbers drifted in at the edges — four flasks, six flasks, ten flasks — designed to confuse. Dagat listened past the interference for the one number the surgeon had actually said. Good tide. I'm the fleet surgeon, and I want to talk about hydration on long voyages. Many of you are not drinking enough water. At sea, the body loses water faster — through sweat, sun, and wind. The recommendation for all active crew: at least eight flasks of fresh water every day. Not brine water, not grog — fresh water. Your navigation depends on a clear mind. A clear mind depends on water. Eight. She held it like a compass needle pointed true north.",
        question: "How many flasks of fresh water per day does the fleet surgeon recommend?",
        choices: [
          { label: "A", text: "Four flasks" },
          { label: "B", text: "Six flasks" },
          { label: "C", text: "Eight flasks" },
          { label: "D", text: "Ten flasks" },
        ],
        answer: "C",
        explanation: "'The recommendation for all active crew: at least eight flasks of fresh water every day.' The recommendation is eight flasks.",
        hint: "Medical advice often uses 'at least' before a number. Listen for those words.",
      },
    ],
    4: [
      {
        audioUrl: A(5, 4, 1),
        audioScript: "Isla ng Tanong's Maritime Museum of the Listening Sea — and Ingay's scatter was at its most relentless here, facts darting away mid-sentence, gallery numbers transposing themselves, rules attaching themselves to the wrong rooms. Dagat stepped through the entrance as the guide's welcome announcement crackled with interference, and she focused with everything she had. Welcome, sailors, to the Maritime Museum of the Listening Sea! Photography is permitted in all galleries EXCEPT Gallery Four — the Weapons Vault — and Gallery Seven — the Navigation Secrets Archive. Flash photography is not allowed anywhere in the building. The full tour takes approximately one hour and forty-five minutes. Restrooms are on the ground deck near the main gangway and on the upper deck near the chart room. The gift shop closes at four-thirty. Stay with your guide at all times. Fair winds! Two galleries. She made sure she had the right two.",
        question: "In which galleries is photography NOT allowed?",
        choices: [
          { label: "A", text: "Galleries Six and Seven" },
          { label: "B", text: "Galleries Four and Five" },
          { label: "C", text: "Galleries Four and Seven" },
          { label: "D", text: "All galleries" },
        ],
        answer: "C",
        explanation: "'Photography is permitted EXCEPT Gallery Four and Gallery Seven.' Those two galleries are restricted.",
        hint: "Listen for 'except' — the galleries named right after it are where photography is NOT allowed.",
      },
      {
        audioUrl: A(5, 4, 2),
        audioScript: "Back at the port on Isla ng Tanong, the recruitment fair was loud — twenty-six vessels, dozens of sailors, and Ingay's scatter tumbling all the rules together into a blur of numbers and conditions. Vessel counts mixed with application limits; fee ranges overlapped with deadlines. Dagat listened for the one critical limit buried in the noise. Welcome to the Port Salita Crew Recruitment Fair! Twenty-six vessels are represented today. To apply, fill your name, sailing experience, and one specialty skill on each vessel's application sheet. You may apply to a maximum of two vessels only. Application processing fees range from fifty to one hundred fifty coppers per vessel. All fees are due by this Friday. May the best sailors find the best ships! Maximum. Two. Ingay had thrown a lot of numbers at her — but only one was the limit she needed.",
        question: "What is the maximum number of vessels a sailor may apply to?",
        choices: [
          { label: "A", text: "One" },
          { label: "B", text: "Three" },
          { label: "C", text: "As many as they like" },
          { label: "D", text: "Two" },
        ],
        answer: "D",
        explanation: "'You may apply to a maximum of two vessels only.' The limit is clearly stated as two.",
        hint: "Listen for 'maximum' — the number right after it is the limit.",
      },
    ],
    5: [
      {
        audioUrl: A(5, 5, 1),
        audioScript: "The Precision Shard was close — Dagat could feel it somewhere near the main harbormaster's post. But Ingay was desperate here, flooding the air with wrong pier numbers: four, four, four. The harbormaster's correction came through the interference, and Dagat braced herself and caught every word. Good tide, all hands! The harbormaster reminds all crew that the daily supply barge arrives at Pier Two — NOT Pier Four as listed on last week's schedule. The barge carries fresh provisions, clean water, and mail from home. It arrives at two bells in the afternoon and departs at four bells. Any crew member wishing to send letters home must have them sealed and addressed before two bells. Latecomers will miss the barge entirely. Two. Not four. Ingay had thrown the wrong number at her hard — but she had held the right one.",
        question: "At which pier does the supply barge now arrive?",
        choices: [
          { label: "A", text: "Pier One" },
          { label: "B", text: "Pier Four" },
          { label: "C", text: "Pier Two" },
          { label: "D", text: "Pier Three" },
        ],
        answer: "C",
        explanation: "'The supply barge arrives at Pier Two — NOT Pier Four.' Pier Two is the correct arrival point; Pier Four was the old listing.",
        hint: "Listen for 'NOT' — what comes before it was old information. What comes after is the correction.",
      },
      {
        audioUrl: A(5, 5, 2),
        audioScript: "The final challenge of Isla ng Tanong — and when Dagat heard the subject of this intelligence report, her breath caught. It was about Isla ng Alingawngaw. The last island. The vault where this whole quest led. Ingay was scattering the numbers with frantic energy — paces transposing, key counts multiplying — because she knew this detail mattered. Dagat listened with everything she had. Maritime intelligence update to all fleet captains: The treasure vault at Isla Alingawngaw has been partially mapped. According to the recovered chart, the entrance lies exactly forty-two paces north of the large split rock near the eastern cove — not at the southern cove as previously believed. The vault door requires three specific keys — a gold key, a silver key, and a bone key — and opens only at low tide. The map was authenticated last Thursday by the Navigation Guild. Three keys. She held the number like a lifeline — because it was connected to where she was going.",
        question: "How many keys are needed to open the vault door?",
        choices: [
          { label: "A", text: "One" },
          { label: "B", text: "Two" },
          { label: "C", text: "Four" },
          { label: "D", text: "Three" },
        ],
        answer: "D",
        explanation: "'The vault door requires three specific keys — a gold key, a silver key, and a bone key.' Three keys are required.",
        hint: "Listen for how many specific items are listed. Count them.",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ISLAND 6 — Isla ng Kwento
  //  Skill: Narrative Comprehension
  //  Setting: Sailor tales, port legends, crew stories, pirate folktales.
  // ══════════════════════════════════════════════════════════════════════════
  6: {
    1: [
      {
        audioUrl: A(6, 1, 1),
        audioScript: "Five shards, and Dagat stepped onto Isla ng Kwento to find it fractured — stories arriving without their middles, endings separated from their beginnings, storytellers frozen mid-tale with the thread broken somewhere she couldn't see. Ingay had shattered their memories. A storyteller near the dock was trying to reassemble a tale about young Nico, his mouth opening and closing as fragments surfaced and sank. Dagat sat beside him and listened to what came through. One afternoon, young sailor Nico found a brass compass on the dock near the market. It was a fine one — polished, needle still true. He picked it up, looked around, and slipped it into his coat pocket. On his way back to the ship, he passed an old navigator sitting on a crate, checking every fold of his coat, eyes red. The old man's hands trembled. Nico watched him for a moment, then turned around and handed back the compass without a word. The old man held his hand with both of his. 'Thank you,' he whispered. 'I've sailed with this compass for forty years.' The thread was intact. She had followed it all the way through.",
        question: "Why did Nico decide to return the compass?",
        choices: [
          { label: "A", text: "He was afraid of being caught by the harbormaster" },
          { label: "B", text: "His captain ordered him to return it" },
          { label: "C", text: "He felt moved after seeing how distressed the owner was" },
          { label: "D", text: "His shipmate told him to give it back" },
        ],
        answer: "C",
        explanation: "Nico was ready to keep it, then saw the old man's trembling hands and red eyes. That moment of empathy is what drove him to return it. No authority figure told him to.",
        hint: "What CHANGED Nico's mind? What specific moment made him act differently?",
      },
      {
        audioUrl: A(6, 1, 2),
        audioScript: "Another storyteller, further into Isla ng Kwento — this one describing a new crew member aboard a ship Dagat recognized instantly. The Baybayin. Her ship. The beginning of Lena's story was there; what came after was broken away somewhere in Ingay's shattering. Dagat listened to what survived of the opening. When young Lena joined the crew of the Baybayin in October, she knew no one. She ate her meals at the far end of the galley and stood her watch at the stern, alone. She told herself she didn't mind — but she did. Every evening she watched her crewmates play cards and tell stories by the lamp, and she felt like she was watching them through a foggy porthole. She had been aboard three weeks and still hadn't said more than five words to anyone. Even broken, the story's beginning was complete enough. Dagat understood the problem before anyone spoke it aloud.",
        question: "What problem did Lena face at the BEGINNING of the story?",
        choices: [
          { label: "A", text: "She failed her navigation test" },
          { label: "B", text: "She joined a new crew and had no friends" },
          { label: "C", text: "Her best crewmate stopped speaking to her" },
          { label: "D", text: "She lost her watch assignment" },
        ],
        answer: "B",
        explanation: "The story opens with Lena being new to the crew, knowing nobody, and feeling invisible. Social isolation as the new crew member is the central problem.",
        hint: "The problem is stated at the BEGINNING. What was Lena's situation when the story opened?",
      },
    ],
    2: [
      {
        audioUrl: A(6, 2, 1),
        audioScript: "Isla ng Kwento's folktale keeper stood frozen at the center of the village square, one hand raised mid-gesture, caught at the most dramatic moment of the old story of Andoy and the golden sea turtle. Ingay had broken the legend — beginning missing from middle, middle detached from end — but Dagat sat down on the stone steps nearby and listened until the whole thing assembled itself in her mind. Deep in the waters of Tanaw Bay, an old fisherman named Andoy once pulled up his net and found, tangled inside, a golden sea turtle. 'Release me,' said the turtle, 'and I will grant you one wish.' Andoy wished for enough fish for his family. The wish was granted. But that night he returned to the water. 'One more,' he begged. The turtle gave him a second wish. A third. A fourth. Each time, Andoy asked for more. On his tenth return, the turtle looked at him with ancient eyes. 'I warned you,' it said — and everything Andoy had was taken by the tide. The story's lesson arrived clear as the day Dagat had earned her first shard.",
        question: "What lesson does the folktale teach?",
        choices: [
          { label: "A", text: "Greed leads to misfortune" },
          { label: "B", text: "Hard work always beats luck" },
          { label: "C", text: "The sea always rewards the humble" },
          { label: "D", text: "Sea creatures are wiser than sailors" },
        ],
        answer: "A",
        explanation: "Andoy received everything he needed but kept going back for more — until he lost it all. This is a clear warning against greed.",
        hint: "What happened to Andoy at the very END? The outcome always shows the lesson of a folktale.",
      },
      {
        audioUrl: A(6, 2, 2),
        audioScript: "Ingay had broken this story in multiple places — the storm scene floating loose from the children's scene, the ending detached from the chain of events that led to it. Dagat's job was to hold every moment in sequence, from first event to last, and find what came at the very end. She listened carefully from the beginning and held the order tight. A fierce storm hit Port Masipag without warning one August night, and by morning the fishing piers were underwater. The children, kept aboard the boats for safety, grew restless after three days. On the fourth day, the youngest child — a girl named Tala — found a sealed crate floating near the hull. Inside were seeds. Her older brothers laughed. 'What good are seeds now?' But Tala planted them in pots on the highest part of the boat. An old woman rowing past handed her a small wooden box. 'Open it when the storm passes.' When the waters receded, the box held a hundred more seeds. By December, Tala's garden fed not just her family, but every crew moored at the pier. Last. She was certain of the last.",
        question: "Which event happened LAST in the story?",
        choices: [
          { label: "A", text: "The children were kept aboard during the storm" },
          { label: "B", text: "The old woman gave Tala a wooden box" },
          { label: "C", text: "Tala planted seeds in pots on the boat" },
          { label: "D", text: "Tala's garden fed the entire pier by December" },
        ],
        answer: "D",
        explanation: "Events in order: storm → children aboard → Tala finds seeds → plants them → old woman gives box → storm passes → box opened → more seeds → December garden. The garden feeding the pier is the final event.",
        hint: "Mentally number events as you hear them. Which one happened at the very end?",
      },
    ],
    4: [
      {
        audioUrl: A(6, 4, 1),
        audioScript: "Pin 4 on Isla ng Kwento — and Ingay was fighting hardest here, pulling story fragments in opposite directions. Dagat caught a memory tale — a grandfather and grandson on a dock at evening — the middle of the story intact, the beginning and end broken away. What the middle revealed about the old man was what she needed. She gathered the fragments and held them still. Every evening, old Mang Celso and his grandson Danny practiced knot-tying on the dock behind their home. One evening, Danny's rope snapped mid-knot. He threw it down and slumped against the wall. Mang Celso sat beside him and said nothing. Then he reached into his coat and pulled out a fresh coil of rope and began tying. 'You knew it would break?' Danny said. 'I always carry a spare,' the old man replied. 'A sailor doesn't leave the dock without a backup line.' The old man had known. He had already prepared. That was the kind of person he was.",
        question: "What does Mang Celso carrying a spare rope reveal about him?",
        choices: [
          { label: "A", text: "He has little confidence in Danny" },
          { label: "B", text: "He is prepared and knows how to handle setbacks" },
          { label: "C", text: "He wants to control how Danny practices" },
          { label: "D", text: "He is worried about wasting supplies" },
        ],
        answer: "B",
        explanation: "Mang Celso said nothing during the failure, then calmly pulled out a spare — he had anticipated the problem and prepared. Quiet readiness, not control.",
        hint: "Why did Mang Celso ALREADY have the spare rope? What kind of person always carries a backup?",
      },
      {
        audioUrl: A(6, 4, 2),
        audioScript: "Another broken story — a memory that carried something heavy in its center, the kind of symbolic weight that Ingay's shattering could not quite destroy. Dagat felt the story's gravity before she understood it, and she listened carefully for what the empty hammock meant — not what it was, but what it meant. Every year on their father's sailing anniversary, Elena and her brother Miguel would light the stern lantern and leave his hammock empty in the crew quarters. Other sailors thought it was strange. 'Why keep a hammock for someone not aboard?' a crewmate asked. Elena looked at the hammock and said, 'He is aboard.' Miguel nodded. Their crewmate didn't understand. But in that ship, the empty hammock was never really empty. The weight of the story rested in those last words. Dagat understood what the hammock held.",
        question: "What does the empty hammock most likely symbolize?",
        choices: [
          { label: "A", text: "The family's wish to forget" },
          { label: "B", text: "A tradition meant to confuse newcomers" },
          { label: "C", text: "Their continued love and connection to their father" },
          { label: "D", text: "A sign their father might return someday" },
        ],
        answer: "C",
        explanation: "Elena and Miguel deliberately maintain the hammock. Elena's response — 'He is aboard' — shows it represents an unbroken emotional bond.",
        hint: "What do Elena and Miguel say and do when asked? Their response tells you what the hammock means.",
      },
    ],
    5: [
      {
        audioUrl: A(6, 5, 1),
        audioScript: "The Story Shard was close — Dagat felt it pulsing with a warmth that moved like narrative, like a story finding its end. Ingay's shattering was almost complete here, the tale arriving in shards that only just held together. But Dagat could feel the shape of it — she had learned to follow stories on this island — and she held on to the thread all the way through. In the old port, there was one rule: never cross the reef passage during monsoon season. One afternoon, twelve-year-old Noel saw his dog stranded on the far sandbar. The passage was churning white. He crossed anyway — reached the dog, started back, then lost his footing on a submerged rock. His older sister, watching from the dock, threw a safety line she happened to be carrying. He grabbed it. Later, when the harbormaster asked why she had the line, she said simply: 'I always carry one during monsoon season.' The story's theme landed clean. She had followed it to the end.",
        question: "What theme does this story most clearly explore?",
        choices: [
          { label: "A", text: "Dogs should be kept away from docks" },
          { label: "B", text: "Preparation and caution can save lives" },
          { label: "C", text: "Children should always disobey port rules" },
          { label: "D", text: "The reef passage is more dangerous than it looks" },
        ],
        answer: "B",
        explanation: "Noel's impulsive crossing nearly cost him. His sister's prepared line saved him. The contrast between recklessness and preparation delivers the lesson.",
        hint: "What saved Noel? Who had the safety line and WHY? The answer to 'why' is the story's lesson.",
      },
      {
        audioUrl: A(6, 5, 2),
        audioScript: "The final challenge of Isla ng Kwento — and the most emotionally layered story on the island. Dagat felt the Story Shard pulse warm the moment the first words reached her, as if the shard already knew this tale was the one. Ingay had tried to shatter it — the reunion scene had been separated from the promise scene, the ending floating apart from everything that made it mean something. But Dagat held every piece in order and let the story find its shape. Before she departed for the eastern trade route, Ate Marina made her younger brother promise to complete his navigator training. 'One promise,' she said. 'Just finish.' He promised. Eight years later, Luis stood at the helm of the Baybayin at his certification ceremony, new navigator's chart in hand, and looked for her face among the docked ships. She wasn't there. But on the dock stood their mother — holding a long-range signal mirror reflecting Ate Marina's image, watching from a trading vessel far out on the horizon. Luis waved. She waved back. Neither signaled anything more. They didn't need to. The Story Shard glowed bright. And somewhere ahead, in the last island, Dagat understood that Ate Marina would matter again.",
        question: "What does the ending reveal about Ate Marina's relationship with Luis?",
        choices: [
          { label: "A", text: "She was too busy with trade and felt guilty" },
          { label: "B", text: "Their bond and fulfilled promise mattered more than being there in person" },
          { label: "C", text: "She forgot and happened to be nearby" },
          { label: "D", text: "The family was upset she could not attend" },
        ],
        answer: "B",
        explanation: "Ate Marina found a way to be present. Luis found her. Neither needed words — the fulfilled promise and unspoken bond transcended distance.",
        hint: "Why didn't Luis and Ate Marina need to signal anything more? What had already been said — and done — between them?",
      },
    ],
  },

  // ══════════════════════════════════════════════════════════════════════════
  //  ISLAND 7 — Isla ng Alingawngaw
  //  Skill: Full Integration Challenge
  //  Story: Ingay's stronghold. All 6 shards combine here into the Crystal.
  // ══════════════════════════════════════════════════════════════════════════
  7: {
    1: [
      {
        audioUrl: A(7, 1, 1),
        audioScript: "Six shards, all six glowing in Dagat's satchel, and Isla ng Alingawngaw rose out of the sea ahead of the Baybayin like a wall of sound. This was Ingay's stronghold — and the moment Dagat stepped ashore, all six effects hit her at once. Words scrambled. Time blurring. Fog pressing in. Emotions stripped away. Facts scattering. Stories breaking mid-sentence. The chaos was total. Dagat closed her eyes and decided what to reach for first: the main idea. She applied everything she'd learned on Isla ng Diwa and pulled the thread from the noise. The waters of the Coral Triangle — home to the most diverse sea life known to sailors — are changing. Navigators have reported rising water temperatures, dying coral reefs, and shifting fish patterns. But what is causing the most visible damage is something far simpler: ship waste dumped at sea. Every season, thousands of barrels of bilge oil and refuse enter the ocean from passing vessels. Sea turtles swallow tar balls. Seabirds ingest rope shreds. Even at three thousand fathoms deep, diving bells have retrieved cloth and metal scraps. The sea is not a dump — but we treat it like one. The question is no longer whether this is a problem. It is whether we will act before it cannot be undone. One thread, through all the chaos. She had it.",
        question: "What is the main idea of this passage?",
        choices: [
          { label: "A", text: "The dangers of ship waste dumped in the sea" },
          { label: "B", text: "How coral reefs form over centuries" },
          { label: "C", text: "The value of deep-sea diving expeditions" },
          { label: "D", text: "Why sea turtles are becoming rare" },
        ],
        answer: "A",
        explanation: "The passage mentioned temperature and coral, but kept returning to ship waste — affected animals, statistics, a call to act. Ship waste pollution is the main idea.",
        hint: "Which problem does the narrator return to AGAIN AND AGAIN? That is the main idea.",
      },
      {
        audioUrl: A(7, 1, 2),
        audioScript: "Still on Isla ng Alingawngaw, the chaos unchanged — scrambled words, blurred time, fog, stripped emotion, scattered facts, broken stories, all of Ingay's weapons deployed at once. Dagat shifted her approach and reached now for something she had learned on Isla ng Damdamin: emotional tone. The words meant something — but how did the speaker feel about them? She listened past the chaos for that. Thank you all for coming to tonight's port council meeting. I want to be very clear: I am not opposed to expanding the commercial docks. More docks mean more ships, more trade, more work for this port — and I understand that. But — hear this carefully — the expansion would be built directly over the freshwater cistern that supplies our entire harbor district. Two engineers reviewed the plan: one says it is safe, one says it is not. I believe we need a third, independent opinion before we break ground. Trade is important. But so is the water our sailors drink. I am not saying no. I am saying: not yet. Let us be certain. The tone — careful, worried, not refusing but not ready — cut through the chaos like a compass needle.",
        question: "What is the speaker's attitude toward the dock expansion?",
        choices: [
          { label: "A", text: "Enthusiastically supportive" },
          { label: "B", text: "Cautiously concerned" },
          { label: "C", text: "Completely indifferent" },
          { label: "D", text: "Strongly opposed and angry" },
        ],
        answer: "B",
        explanation: "The speaker acknowledges economic benefits but consistently adds 'but' and concern about the cistern. 'Not saying no — not yet' is the clearest sign of cautious concern.",
        hint: "The speaker says some positive things AND some worried things. Which outweighs the other? How forceful is the tone?",
      },
    ],
    2: [
      {
        audioUrl: A(7, 2, 1),
        audioScript: "Dagat pressed deeper into Isla ng Alingawngaw, the six-way chaos still battering at her ears. Now she deployed what she had learned on Isla ng Tanong: precision. One specific detail, held against the storm of wrong ones. An announcement about a new navigation program came through the noise, and Dagat reached past the distractions for the one precise action item buried inside it. Good tide, all crew members! The fleet has been selected to pilot a new Regional Navigation Program starting next month. Participation is voluntary but strongly encouraged. The program runs every Saturday morning from eight bells to ten bells, for twelve consecutive weeks. There is no cost. You will receive free sea charts and a navigation certificate upon completion. Here is the important part: to join, you must submit a signed permission note from your ship's captain — not the harbormaster, but your own captain — by this Thursday. No late submissions accepted. Captain. Thursday. That was the detail. She held it like a fixed star.",
        question: "What specific requirement must sailors meet to join the program?",
        choices: [
          { label: "A", text: "It costs fifty coppers and starts next month" },
          { label: "B", text: "It runs every Saturday for twelve weeks" },
          { label: "C", text: "Attendance is required for all crew" },
          { label: "D", text: "They must submit a captain-signed note by Thursday" },
        ],
        answer: "D",
        explanation: "The most specific action item: 'submit a signed note from your captain — not the harbormaster — by Thursday. No late submissions.' D is the critical requirement.",
        hint: "What were sailors told to DO, by WHEN? That call to action is the key detail.",
      },
      {
        audioUrl: A(7, 2, 2),
        audioScript: "A voice reached Dagat through the chaos of Isla ng Alingawngaw — she could not see the speaker, could not locate the direction, could only hear the words arriving through Ingay's full storm of scrambled context, blurred time, foggy meaning, stripped emotion, scattered facts, and broken framing. She deployed the inference skills she had sharpened on Isla ng Damdamin: listen for what the speaker tracked, where they worked, how they spoke. I want to be honest with you. You have real potential — I see it in how you read the currents during drills. But your chart submissions this quarter are below fifty percent complete, and your last three navigation assessments have dropped significantly. I'm not here to punish you. I want to understand what's happening. Is something wrong aboard ship? Are you struggling with the coursework? My door at the chart room is always open. But I need you to take this seriously — because this is your record, and these marks follow you through your career. You are capable of far more than this. Chart submissions. Navigation assessments. The chart room. The role assembled itself from the evidence.",
        question: "What can you infer about the speaker's role?",
        choices: [
          { label: "A", text: "The speaker is the sailor's crewmate" },
          { label: "B", text: "The speaker is the sailor's older sibling" },
          { label: "C", text: "The speaker is the sailor's navigation instructor" },
          { label: "D", text: "The speaker is the sailor's ship captain" },
        ],
        answer: "C",
        explanation: "Chart submissions, navigation assessments, 'my door at the chart room' — these point to an instructor tracking academic progress, not a captain or crewmate.",
        hint: "What does the speaker track, and where is their office? Those clues reveal their role.",
      },
    ],
    4: [
      {
        audioUrl: A(7, 4, 1),
        audioScript: "And then Dagat heard a voice she recognized. Through all of Ingay's chaos — the scrambled words, the time-blur, the fog, the drained emotion, the scattered facts, the broken stories — a voice cut through that she had first heard frozen on Isla ng Salita. Old Mang Berto. He was here. They were all gathering here, she realized — the people she had encountered across every island, drawn to Ingay's stronghold like sailors to a lighthouse in a storm. Mang Berto was telling a story about a word — a word Dagat knew she was going to need. Let me tell you about a sailor I once knew. She failed her first navigation test. Failed her second. Her crewmates passed their certifications while she retook the course. People told her she wasn't cut out for the sea. She began to believe them. But one navigator — just one — said to her: 'Every time you fail and come back, you are doing what most people cannot. You are resilient.' She didn't know that word yet. But she felt it. She tried again. And again. Three years later, she stood at the helm of the fleet's lead vessel as its chief navigator. The word she learned in defeat — resilience — became the word she sailed by. Dagat listened without a word. She knew that word. She had been living it.",
        question: "What word does the story define through the sailor's experience?",
        choices: [
          { label: "A", text: "Resilience" },
          { label: "B", text: "Mediocre" },
          { label: "C", text: "Perpetual" },
          { label: "D", text: "Ambiguous" },
        ],
        answer: "A",
        explanation: "The navigator says it directly: 'You are resilient.' The entire story demonstrates it — failing repeatedly but continuing until succeeding.",
        hint: "The navigator says the word out loud. Which word describes what the sailor kept doing after each failure?",
      },
      {
        audioUrl: A(7, 4, 2),
        audioScript: "From the very beginning, no one expected Dagat to make it past the first island. The Isla ng Salita seemed impossible — its words all scrambled by Ingay's spell. The second island, with its rushing currents of rapid speech, nearly broke her. By the third, shrouded in fog, she almost turned back. But she pressed on through the island of feelings, the island of hidden details, the island of broken stories. And finally she stood before the last island — the Isla ng Alingawngaw. In her hands: six glowing shards. In her heart: everything she had learned. She placed the shards together, and the Alingawngaw Crystal sang — a sound like every voice that had ever spoken truth. Captain Salita stepped forward, and for the first time in one hundred years he said aloud: 'I have waited a long time for ears like yours.'",
        question: "What is the MOST COMPLETE summary of everything you just heard?",
        choices: [
          { label: "A", text: "A student studied hard and earned high marks" },
          { label: "B", text: "A teacher encouraged a student to read more books" },
          { label: "C", text: "A young sailor overcame seven challenges and completed a legendary quest" },
          { label: "D", text: "A port celebrated its top navigators at an awards ceremony" },
        ],
        answer: "C",
        explanation: "The passage covers: doubt → 7 island challenges → perseverance → Crystal formed → Salita's voice restored. Only C captures the complete arc.",
        hint: "The best summary includes the BEGINNING challenge, the MIDDLE journey, and the END outcome.",
      },
    ],
    5: [
      {
        audioUrl: A(7, 5, 1),
        audioScript: "In the heart of the last island, the noise was deafening. Ingay's storm filled the air — words overlapping, feelings stripped away, details scattered, stories torn apart. Dagat stood still and closed her eyes. She thought of every skill she had learned. She listened for the context around the strange words. She slowed her mind against the rushing current of speech. She reached for the thread of the main idea. She felt for the tone beneath the chaos. She held the precise detail like a compass in her hand. She followed the story all the way to its end. And then she heard it: one clear voice, cutting through everything. 'Well done, sailor,' it said. 'I hear you now.'",
        question: "What is the most complete summary of what the passage describes?",
        choices: [
          { label: "A", text: "Dagat learning a new listening skill for the first time" },
          { label: "B", text: "Captain Salita giving orders before the final battle" },
          { label: "C", text: "Dagat using all her listening skills to break through Ingay's chaos and hear Captain Salita" },
          { label: "D", text: "Ingay surrendering and leaving the island peacefully" },
        ],
        answer: "C",
        explanation: "The passage names all six skills — each applied by Dagat until she hears Salita's voice. Only C captures both the process and the outcome.",
        hint: "What did Dagat do step by step? And who did she hear at the end? Both parts matter.",
      },
      {
        audioUrl: A(7, 5, 2),
        audioScript: "Captain Salita stepped forward. He had not spoken — truly spoken — in one hundred years. He opened his mouth, and what came out was not a whisper. It was a voice: warm, weathered, full of the sea. 'I have waited a hundred years for ears like yours,' he said. 'The Listening Sea is free. Ingay is silent. And you — you are no longer a student. You are a sailor.' He pressed the Alingawngaw Crystal into Dagat's hands. It sang. It was the sound of every word ever understood. Every feeling heard. Every story followed to its end. The sea was quiet. And it was beautiful.",
        question: "When Captain Salita says Dagat is 'no longer a student' but 'a sailor,' what does he mean?",
        choices: [
          { label: "A", text: "Dagat has decided to leave and sail the ocean" },
          { label: "B", text: "Dagat has proven herself and is now fully capable" },
          { label: "C", text: "The Captain is giving Dagat a crew assignment" },
          { label: "D", text: "Dagat failed but will get another chance" },
        ],
        answer: "B",
        explanation: "'Sailor' is the title of mastery in this world. Salita is recognizing Dagat's transformation from learner to someone fully equipped.",
        hint: "In the story's world, what does earning the title 'sailor' mean? Think about everything Dagat has proven.",
      },
    ],
  },
};

// ─── Pin definitions per island ───────────────────────────────────────────────

function getPinDefs(_islandNum: number) {
  return [
    { number: 1, type: "CHALLENGE" as const, sortOrder: 1 },
    { number: 2, type: "CHALLENGE" as const, sortOrder: 2 },
    { number: 3, type: "CHECKPOINT" as const, sortOrder: 3 },
    { number: 4, type: "CHALLENGE" as const, sortOrder: 4 },
    { number: 5, type: "CHALLENGE" as const, sortOrder: 5 },
  ];
}

// ─── Island definitions with full story-tied NPC dialogues ───────────────────

const islandDefs = [
  {
    number: 1,
    name: "Isla ng Salita",
    skillFocus: "Vocabulary in Context",
    description: "The villagers here are frozen in silence. Ingay scrambled their words and no one can understand each other. Listen carefully to the words around the unfamiliar ones — context is your compass.",
    isLocked: false,
    npcName: "Captain Salita",
    npcDialogueIntro: "These villagers are frozen, young sailor. Ingay scrambled their words — turned meaning to noise. Listen to what surrounds the strange words. Context is your compass. It always has been. This is where your journey begins.",
    npcDialogueSuccess: "The villagers breathe again! You unfroze them with your ears. The Vocabulary Shard is yours — first of seven. Sail on, Dagat. The sea is watching.",
    npcDialogueFail: "Ingay's noise still holds them. The clues are in the words nearby — listen again.",
    shardItemName: "The Vocabulary Shard",
    shardDescription: "A glowing shard that pulses with the rhythm of a thousand words.",
  },
  {
    number: 2,
    name: "Isla ng Bilis",
    skillFocus: "Rapid Speech Comprehension",
    description: "Ingay sped up time on this island. Everyone speaks too fast to follow. Still your mind, breathe slowly, and let the words land where they will.",
    isLocked: true,
    npcName: "Captain Salita",
    npcDialogueIntro: "The Vocabulary Shard brought you this far — your ears already sharper for it. But Ingay sped up time on Bilis. Everyone speaks too fast to follow. The first shard taught you to hear meaning. Now learn to hear at speed.",
    npcDialogueSuccess: "You matched the current! Two shards now — the Swift Shard shines. Ingay sped up the world and you kept pace. Five islands left, young sailor.",
    npcDialogueFail: "The words slipped past. Ingay wins this round — slow your breath and listen once more.",
    shardItemName: "The Swift Shard",
    shardDescription: "A shard that vibrates so fast it hums with invisible energy.",
  },
  {
    number: 3,
    name: "Isla ng Diwa",
    skillFocus: "Main Idea and Details",
    description: "Ingay covered this island in thick fog. The main idea is buried beneath layers of detail and misdirection. Find what the speaker keeps returning to — that is the heart of it.",
    isLocked: true,
    npcName: "Captain Salita",
    npcDialogueIntro: "Two shards already in your satchel. Ingay's answer to your speed is fog — she buried the main idea under layers of detail on Isla ng Diwa. Ask yourself: what point does the speaker return to most? That thread is your lantern.",
    npcDialogueSuccess: "The fog lifts! Three shards now — the Clarity Shard is yours. You are halfway through the Listening Sea, Dagat. Halfway home.",
    npcDialogueFail: "Ingay's fog won this time. Find what connects all the details — that thread is the main idea.",
    shardItemName: "The Clarity Shard",
    shardDescription: "A shard as clear as still water on a windless morning.",
  },
  {
    number: 4,
    name: "Isla ng Damdamin",
    skillFocus: "Emotional Tone and Inference",
    description: "Ingay drained all emotion from this island. Everyone speaks in the same flat voice. But feelings hide in pauses, in speed, in word choice — listen for the heart, not just the words.",
    isLocked: true,
    npcName: "Captain Salita",
    npcDialogueIntro: "Three shards. Ingay tried scrambled words, blinding speed, and smothering fog — and you answered every one. Now she drains emotion. Words on this island are flat and colorless. But feelings hide in pauses, in pitch, in the spaces between syllables. Listen for them.",
    npcDialogueSuccess: "You heard the heart behind the voice! The Empathy Shard glows warm in your hands — four shards now. Ingay's tricks grow crueler. And your ears grow sharper.",
    npcDialogueFail: "The feeling was there. Listen for HOW the speaker says it, not just WHAT they say.",
    shardItemName: "The Empathy Shard",
    shardDescription: "A warm shard that glows red when you hold it close.",
  },
  {
    number: 5,
    name: "Isla ng Tanong",
    skillFocus: "Listening for Specific Information",
    description: "Ingay scattered the island's records — names, dates, numbers, all jumbled. Listen for the exact detail and hold it in your mind. The facts are there. You just have to catch them.",
    isLocked: true,
    npcName: "Captain Salita",
    npcDialogueIntro: "Four shards. Ingay scattered the island's records — names, dates, numbers, all jumbled and lost. You have learned to hear meaning, speed, main ideas, and feeling. Now hold a single precise fact like a compass needle in your mind. Do not let it slip.",
    npcDialogueSuccess: "You caught the exact detail Ingay tried to scatter! Five shards, young sailor. One island of preparation before the last.",
    npcDialogueFail: "Ingay hid the detail well. The specific fact is always spoken — it waits for ears patient enough to catch it.",
    shardItemName: "The Precision Shard",
    shardDescription: "A sharp-edged shard that reflects light at exact, perfect angles.",
  },
  {
    number: 6,
    name: "Isla ng Kwento",
    skillFocus: "Narrative Comprehension",
    description: "Ingay fragmented the storytellers' memories. The narratives are broken and out of order. Follow every character from beginning to end — do not let go of the thread.",
    isLocked: true,
    npcName: "Captain Salita",
    npcDialogueIntro: "Five shards. Ingay's final trick before her stronghold: she shattered the storytellers' memories. The narrative is broken. You must follow every event — beginning to end — without letting go of the thread. Stories, Dagat, are how sailors find their way home.",
    npcDialogueSuccess: "You followed the story all the way home! Six shards — every one earned through your own listening. The last island awaits. Ingay's stronghold. But look at what you carry.",
    npcDialogueFail: "The story slipped at a turn. Follow the characters — their journey will lead you to the answer.",
    shardItemName: "The Story Shard",
    shardDescription: "A shard with a tiny scene frozen in its center, like a snow globe.",
  },
  {
    number: 7,
    name: "Isla ng Alingawngaw",
    skillFocus: "Full Integration Challenge",
    description: "This is Ingay's stronghold — the final island. Every skill you have learned converges here: vocabulary, speed, main idea, emotion, detail, narrative. Assemble the six shards. Form the Crystal. Trust your ears.",
    isLocked: true,
    npcName: "Captain Salita",
    npcDialogueIntro: "Six shards. This is Ingay's heart — her last stronghold. Every skill you have built: words, speed, main ideas, feeling, precise detail, narrative — she will throw all of them at you at once. Trust what your ears have become.",
    npcDialogueSuccess: "The Alingawngaw Crystal sings! Ingay is silent. The Listening Sea is free. And Captain Salita — for the first time in one hundred years — speaks again. You have done it, Dagat. You are a sailor.",
    npcDialogueFail: "Ingay is strong here. But you are stronger. Use everything you know — listen with your whole self.",
    shardItemName: "The Echo Shard",
    shardDescription: "The greatest shard — it echoes with the sound of every island you have conquered.",
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌊 Seeding LinguaQuest database...\n");

  // ── Users ────────────────────────────────────────────────────────────────────
  const hash = (pw: string) => bcrypt.hash(pw, 10);

  await prisma.user.upsert({
    where: { username: "dagat" },
    update: {},
    create: {
      username: "dagat",
      email: "dagat@linguaquest.app",
      passwordHash: await hash("student123"),
      role: "STUDENT",
      characterModeEnabled: true,
    },
  });

  await prisma.user.upsert({
    where: { username: "marina" },
    update: {},
    create: {
      username: "marina",
      email: "marina@linguaquest.app",
      passwordHash: await hash("student123"),
      role: "STUDENT",
      characterModeEnabled: false,
    },
  });

  await prisma.user.upsert({
    where: { username: "captain" },
    update: {},
    create: {
      username: "captain",
      email: "captain@linguaquest.app",
      passwordHash: await hash("teacher123"),
      role: "TEACHER",
      characterModeEnabled: false,
    },
  });

  console.log("✓ Users seeded (dagat, marina, captain)");

  // ── Islands ──────────────────────────────────────────────────────────────────

  for (const def of islandDefs) {
    const island = await prisma.island.upsert({
      where: { number: def.number },
      update: {
        name: def.name,
        skillFocus: def.skillFocus,
        description: def.description,
        npcName: def.npcName,
        npcDialogueIntro: def.npcDialogueIntro,
        npcDialogueSuccess: def.npcDialogueSuccess,
        npcDialogueFail: def.npcDialogueFail,
        shardItemName: def.shardItemName,
        shardDescription: def.shardDescription,
      },
      create: def,
    });

    const pinDefs = getPinDefs(def.number);

    for (const pinDef of pinDefs) {
      const pin = await prisma.pin.upsert({
        where: { islandId_number: { islandId: island.id, number: pinDef.number } },
        update: {},
        create: { islandId: island.id, ...pinDef },
      });

      if (pinDef.type === "CHECKPOINT") continue;

      const challenges = CHALLENGES[def.number]?.[pinDef.number] ?? [];

      // Clear and recreate challenges (no stable business key)
      await prisma.challenge.deleteMany({ where: { pinId: pin.id } });
      if (challenges.length > 0) {
        await prisma.challenge.createMany({
          data: challenges.map((c, i) => ({
            pinId: pin.id,
            audioUrl: c.audioUrl,
            audioScript: c.audioScript,
            question: c.question,
            choices: c.choices as any,
            answer: c.answer,
            explanation: c.explanation,
            hint: c.hint,
            sortOrder: i + 1,
          })),
        });
      }
    }

    console.log(`✓ Island ${def.number}: ${def.name} — ${pinDefs.filter((p) => p.type === "CHALLENGE").length} challenge pins`);
  }

  console.log("\n✅ Seed complete!\n");
  console.log("  Student (character mode ON): dagat / student123");
  console.log("  Student (character mode OFF): marina / student123");
  console.log("  Teacher: captain / teacher123");
  console.log("\n  📜 Audio scripts are in the audioScript field of each Challenge.");
  console.log("  🎙️  Give these scripts to a voice actor or run through TTS (Google / ElevenLabs).");
  console.log("  🔗 Upload the .mp3 files and update audioUrl with real CDN links.");
  console.log("  🌐 Recommended CDN: Cloudinary or Vercel Blob\n");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
