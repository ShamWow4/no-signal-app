import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Initialize Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (getApps().length === 0) {
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const companies = [
  { name: 'AK AV', website: '', phone: '504-717-8252', contact: 'AK Lamoza', position: 'Owner', type: 'AV Production' },
  { name: 'ASM Global', website: 'https://asmglobal.com', phone: '', contact: '', position: '', type: 'Venue Management' },
  { name: 'Audio Visual Nation', website: 'https://audiovisualnation.com/crew-portal/join-the-crew/', phone: '', contact: '', position: '', type: 'AV Production' },
  { name: 'A/V Textberts', website: '', phone: '702-780-4429', contact: 'Ed Shelby', position: 'Owner', type: 'AV Labor' },
  { name: 'The AVent Techs', website: 'https://www.theaventtechs.com/join-our-team/', phone: '213-375-3088', contact: 'Marcus Welch', position: '', type: 'AV Labor' },
  { name: 'AV Labor Source', website: 'https://avlaborsourceinc.com/careers', phone: '', contact: '', position: '', type: 'AV Labor' },
  { name: 'AV Lancer', website: 'https://avlancer.com', phone: '866-285-2623', contact: 'Blake Zblewski', position: 'Director of Operations', type: 'AV Labor' },
  { name: 'AV Leads', website: 'https://avleads.com', phone: '202-780-9862', contact: 'Nick Kilhefner', position: 'Sales & Operations', type: 'AV Labor' },
  { name: 'AVTS', website: 'https://avts.com', phone: '210-804-2403', contact: 'Gene', position: 'Owner', type: 'AV Labor' },
  { name: 'BPS - Broadcast Productions Services', website: 'https://broadcast-av.com/', phone: '630-235-3581', contact: 'Amy Bradshaw', position: 'Owner', type: 'Broadcast' },
  { name: 'CAVL', website: 'https://cavllabor.com', phone: '407-883-2904', contact: 'Christian Regelado', position: 'Labor Coordinator', type: 'AV Labor' },
  { name: 'Center Stage', website: 'https://centerstaging.net', phone: '504-570-8345', contact: 'Brent', position: 'Labor Coordinator', type: 'Production' },
  { name: 'Corporate Lighting & Audio', website: 'https://corplighting.com', phone: '504-837-3947', contact: 'John', position: 'Project Manager', type: 'AV Production' },
  { name: 'Creative Technology', website: 'mailto:hello@ctus.com', phone: '', contact: '', position: '', type: 'Production' },
  { name: 'Crescent Sound & Light', website: 'https://crescentsl.com', phone: '', contact: '', position: '', type: 'AV Production' },
  { name: 'Crew 1', website: 'https://crew1.com', phone: '', contact: '', position: '', type: 'AV Labor' },
  { name: 'Dispatch AV', website: 'https://dispatchav.com', phone: '214-801-7611', contact: 'Nicholas Mitchell', position: 'Owner', type: 'AV Labor' },
  { name: 'D Nick Productions', website: '', phone: '504-628-0157', contact: 'David Nick', position: 'Owner', type: 'Production' },
  { name: 'Emmanuel', website: '', phone: '504-657-6618', contact: 'Storm Leigh', position: 'Owner', type: 'AV Labor' },
  { name: 'Encore', website: 'https://www.encoreglobal.com/', phone: '972-561-6939', contact: 'Chelsie Kolarick', position: 'Labor Manager', type: 'Corporate AV' },
  { name: 'Freeman AV', website: 'https://freeman.com', phone: '407-497-4996', contact: 'Alex Rowe', position: 'Manager', type: 'Production & Rigging' },
  { name: 'Gig Life', website: 'https://thegiglife.com', phone: '321-301-5524', contact: 'Eric', position: 'Labor Coordinator', type: 'AV Labor' },
  { name: 'Hueview Productions', website: 'https://huview.com', phone: '213-570-0627', contact: 'Georgetta Brown', position: 'Labor Coordinator', type: 'Production' },
  { name: 'IATSE Local 39', website: 'https://iatse39.org', phone: '504-872-2115', contact: 'Faye', position: 'Labor Coordinator', type: 'Labor Union' },
  { name: 'Lasso Marketplace', website: 'https://lasso.io', phone: '708-568-1588', contact: 'Tracey Bugal', position: 'Labor Coordinator', type: 'AV Labor' },
  { name: 'Mayco', website: 'https://mayco.live/join-our-crew', phone: '', contact: '', position: '', type: 'AV Labor' },
  { name: 'Mitey AV', website: 'https://miteyav.com', phone: '504-941-9151', contact: 'Shaun McCarron', position: 'Owner', type: 'AV Production' },
  { name: 'MoxieNOLA', website: 'https://www.moxienola.com/contact/', phone: '504-220-2129', contact: '', position: '', type: 'Production' },
  { name: 'Noa AV', website: 'https://facebook.com/nahro.noa', phone: '407-552-9177', contact: 'Noah Narro', position: 'Owner', type: 'AV Production' },
  { name: 'Pearson Technologies', website: 'https://gopearsontechnology.com', phone: '469-595-1592', contact: 'Brandon', position: 'Labor Coordinator', type: 'AV Labor' },
  { name: 'Phoenix Rigging', website: 'https://phoenixrigging.com', phone: '225-636-1177', contact: 'Doss Hicks', position: 'Owner', type: 'Rigging' },
  { name: 'Power On Productions', website: 'https://poweronproductions.com', phone: '985-400-3927', contact: 'Sean Howlett', position: 'Owner', type: 'Production' },
  { name: 'Propaganda', website: 'https://propagandagroup.com/', phone: '504-415-3496', contact: 'Brian Hrabar', position: 'Owner', type: 'Production' },
  { name: 'Pyramid', website: 'https://pyramidav.com', phone: '504-333-9683', contact: 'David Latina', position: 'Hiring Manager', type: 'AV Production' },
  { name: 'Quest Show Services', website: 'https://questevents.com', phone: '469-613-8018', contact: 'Micheal Heyse', position: 'National Labor Director', type: 'Production' },
  { name: 'Rhino Staging', website: 'https://rhinostaging.com', phone: '225-644-5600', contact: '', position: '', type: 'Rigging & Labor' },
  { name: 'RZI Lighting', website: 'https://rzilighting.com', phone: '318-341-4369', contact: 'Kim Wytcherly', position: 'Labor Coordinator', type: 'Lighting' },
  { name: 'TLS Technical Labor Solutions', website: 'https://tlslabor.com', phone: '504-701-9213', contact: 'Eliot Parker', position: 'Owner', type: 'AV Labor' },
  { name: 'Certified Video Services', website: 'https://jamesthomasproductions.com', phone: '504-460-8607', contact: 'T.J. Thompson', position: 'Owner', type: 'Video Production' },
  { name: 'Sea Hear Productions', website: 'https://seahear.com', phone: '985-871-7369', contact: '', position: '', type: 'Production' },
  { name: 'Sound Source Productions', website: 'https://www.s2pinc.com/contact', phone: '256-513-4739', contact: '', position: '', type: 'Audio Production' },
  { name: 'Shine Street Production', website: 'https://shinestreetproduction.com', phone: '407-406-3064', contact: 'James Marzak', position: 'Owner', type: 'Production' },
  { name: 'Show Masters Production Logistics', website: 'https://showmasters.com', phone: '817-609-7375', contact: 'Jen Rainey', position: 'Labor Coordinator', type: 'Production' },
  { name: 'ShowPhaze', website: 'https://showphaze.com', phone: '737-704-8858', contact: 'Juan Martinez', position: '', type: 'Production' },
  { name: 'Turning Point AV', website: 'https://www.turningpointav.com/careers', phone: '', contact: '', position: '', type: 'AV Production' },
  { name: 'Westaff', website: 'https://westaff.com', phone: '504-615-2340', contact: 'Robert Bourgault', position: 'Labor Manager', type: 'Staffing' },
  { name: 'Williams Signal AV', website: 'https://williamssignal.com', phone: '817-600-5664', contact: 'Adam Zorn', position: 'Regional Labor Coordinator', type: 'AV Production' },
  { name: 'Vital Tech Productions', website: 'https://vitaltechproductions.com', phone: '407-963-4526', contact: 'Sharon Moeller', position: 'Labor Coordinator', type: 'Production' },
  { name: '@ Your Service', website: 'https://aysts.com/contact-us/', phone: '', contact: '', position: '', type: 'Staffing' }
];

async function seedDirectory() {
  console.log("Starting comprehensive directory seed...");
  
  const directoryRef = db.collection('labor_directory');
  let addedCount = 0;
  let updatedCount = 0;

  for (const company of companies) {
    try {
      // Check if exists
      const snapshot = await directoryRef.where('name', '==', company.name).get();
      if (snapshot.empty) {
        await directoryRef.add(company);
        addedCount++;
        console.log(`Added: ${company.name}`);
      } else {
        // Update existing record with the new comprehensive data
        const docId = snapshot.docs[0].id;
        await directoryRef.doc(docId).update(company);
        updatedCount++;
        console.log(`Updated: ${company.name}`);
      }
    } catch (error) {
      console.error(`Error processing ${company.name}:`, error);
    }
  }

  console.log(`Successfully added ${addedCount} new companies, updated ${updatedCount}.`);
}

seedDirectory().catch(console.error);
