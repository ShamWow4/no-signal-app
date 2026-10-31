import fs from 'fs';

async function generateTrainingData() {
  console.log('📚 Generating expanded AV technical training curriculum...');

  const trainingModules = [
    {
      title: 'Digital Mixing Console Gain Staging & Routing',
      category: 'Audio',
      difficulty: 'Intermediate',
      summary: 'Mastering headamp gain, digital trims, DCA assignments, and virtual soundcheck workflows on digital consoles.',
      content: 'Proper gain staging ensures optimal signal-to-noise ratio. Always set preamp gain from the loudest source peak, leaving at least 18dB of headroom before hitting digital clipping.'
    },
    {
      title: 'Dante Audio-over-IP Networking & Clocking',
      category: 'IT / AV-Over-IP',
      difficulty: 'Intermediate',
      summary: 'Understanding PTP clock synchronization, primary/secondary redundancy, and single-switch Dante Controller configurations.',
      content: 'All Dante devices use human-readable names and automatically discover each other. Ensure PTP master clock stability and avoid network loops by configuring IGMP snooping correctly on managed switches.'
    },
    {
      title: 'Video Switcher Signal Flow & EDID Management',
      category: 'Video',
      difficulty: 'Advanced',
      summary: 'Resolving handshake failures, scaling constraints, and frame synchronization across multi-format IMAG setups.',
      content: 'EDID spoofing and custom resolution scaling prevent black screens when switching between disparate laptop sources and LED processors.'
    },
    {
      title: 'DMX512 & Art-Net Network Configuration',
      category: 'Lighting',
      difficulty: 'Intermediate',
      summary: 'Understanding universe allocation, IP subnetting for Art-Net/sACN, and fixture personality patching.',
      content: 'A single DMX universe handles 512 channels. When running Art-Net over Cat6, ensure nodes are on a dedicated VLAN with IGMP snooping enabled.'
    },
    {
      title: 'Rigging Safety & Overhead Load Calculations',
      category: 'Rigging',
      difficulty: 'Advanced',
      summary: 'Calculating dead-hung loads, bridle forces, motor capacities, and steel sling safety factors.',
      content: 'Always verify structural engineer load ratings before hanging chain hoists. Never exceed 50% of the working load limit (WLL) for dynamic or shock-load scenarios.'
    },
    {
      title: 'Projection Mapping & Surface Calibration',
      category: 'Projection',
      difficulty: 'Advanced',
      summary: 'Using TouchDesigner, Resolume Arena, and HeavyM for geometric correction and edge blending.',
      content: 'Ensure projector throw ratios match architectural distances. Use test patterns for pixel mapping and lumens calculation based on ambient light.'
    }
  ];

  console.log(`✅ Compiled ${trainingModules.length} core technical training modules.`);

  const header = ['Course Title', 'Category', 'Difficulty', 'Summary', 'Content'].join('\t') + '\n';
  const rows = trainingModules.map(m => `${m.title}\t${m.category}\t${m.difficulty}\t${m.summary}\t${m.content}`).join('\n');
  
  fs.writeFileSync('av_training.tsv', header + rows);
  console.log('💾 Saved structured data to av_training.tsv');
}

generateTrainingData();
