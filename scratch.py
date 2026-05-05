import re
import sys

def process_file(source_path, target_path, new_title, new_subtitle, new_data):
    with open(source_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Replace title
    content = re.sub(r'<title>.*?</title>', f'<title>{new_title}</title>', content)
    
    # Replace header h1 and subtitle
    content = re.sub(r'<h1>.*?</h1>', f'<h1>{new_title}</h1>', content)
    content = re.sub(r'<div class="subtitle">.*?</div>', f'<div class="subtitle">{new_subtitle}</div>', content)
    
    # Replace eyebrow
    content = re.sub(r'<div class="eyebrow">.*?</div>', f'<div class="eyebrow">Classical Indian Philosophy</div>', content)

    # Replace data array
    # The data array starts with 'const data=[' and ends with '];' right before 'const colors=Object.values(C);'
    pattern = re.compile(r'const data=\[.*?\n\];', re.DOTALL)
    content = pattern.sub(new_data, content)

    with open(target_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Samkhya Data
samkhya_data = """const data=[
{pada:"Samkhya Karika",sub:"Sample · First 3 Verses",ref:"SK 1-3",
intro:"Īśvarakṛṣṇa's Sāṃkhyakārikā is the oldest surviving text of the Samkhya school. It outlines the dualistic philosophy of Puruṣa (consciousness) and Prakṛti (matter). This is a representative sample showing the structure.",
branches:[
{name:"Introduction & Purpose",ref:"SK 1-3",color:C.purple,children:[
{n:"Duḥkha-traya-abhighātāt",d:"From the torment of the threefold suffering...",r:"SK 1",
det:{
c:"Due to the torment of the threefold suffering (internal, external, and divine/celestial), an inquiry into the means of terminating it arises. If it is said that this inquiry is superfluous since visible means exist, we say no, because visible means are not absolute or final.",
ex:"Worldly remedies (medicine, wealth) cure suffering temporarily, but it always returns. Samkhya promises a final, irrevocable end to suffering through knowledge.",
v:"Vyāsa (Yoga Bhasya): Suffering is the starting point of all philosophy.",
vb:"Hariharananda Aranya: The threefold suffering is adhyatmika (bodily/mental), adhibhautika (from other beings), and adhidaivika (from planetary/supernatural forces)."
}},
{n:"Dṛṣṭavad ānuśravikaḥ",d:"The revealed (Vedic) means are like the visible ones...",r:"SK 2",
det:{
c:"The means revealed in the Vedas are like the visible means: they are linked with impurity, decay, and excess. A superior method is different from both: it is the discriminative knowledge of the Manifest (Vyakta), the Unmanifest (Avyakta), and the Knower (Jña/Puruṣa).",
ex:"Vedic rituals involve animal sacrifice (impurity) and yield temporary heavens (decay). Only pure philosophical discrimination provides eternal liberation."
}},
{n:"Mūlaprakṛtir avikṛtiḥ",d:"Root Prakṛti is not a modification...",r:"SK 3",
det:{
c:"Root Prakṛti (mūlaprakṛti) is not a product. The seven principles beginning with Mahat are both products and producers. The sixteen (senses, mind, elements) are only products. Puruṣa is neither a product nor a producer.",
ex:"This verse establishes the entire 25-principle ontology of Samkhya in one sweep."
}}
]}
]}
];"""

# Nyaya Data
nyaya_data = """const data=[
{pada:"Nyaya Sutras",sub:"Sample · First Chapter",ref:"NS 1.1",
intro:"Gautama's Nyāya Sūtras lay the foundation for Indian logic and epistemology. It details the 16 categories (padārthas) whose true knowledge leads to liberation. This is a representative sample showing the structure with commentaries.",
branches:[
{name:"The 16 Categories & Purpose",ref:"NS 1.1",color:C.amber,children:[
{n:"Pramāṇa-prameya...",d:"Knowledge of the 16 categories leads to the highest good.",r:"NS 1.1.1",
det:{
c:"Supreme felicity (apavarga) is attained by the knowledge of the true nature of: 1. Means of right knowledge (pramāṇa), 2. Object of right knowledge (prameya), 3. Doubt, 4. Purpose, 5. Familiar instance, 6. Established tenet, 7. Members of a syllogism, 8. Confutation, 9. Ascertainment, 10. Discussion, 11. Wrangling, 12. Cavil, 13. Fallacy, 14. Quibble, 15. Futility, and 16. Ground of defeat.",
v:"Vātsyāyana (Nyāya Bhāṣya): Without the means of knowledge, the object cannot be known. The lamp of all sciences is Nyaya.",
vm:"Vācaspati Miśra (Tātparya Tīkā): The knowledge of these 16 categories is instrumental in removing ignorance, the root of all suffering.",
vb:"Udayana (Pariśuddhi): The removal of false knowledge leads to the cessation of faults, which stops activity, ending rebirth and suffering."
}},
{n:"Duḥkha-janma...",d:"The chain of cessation leading to liberation.",r:"NS 1.1.2",
det:{
c:"Pain, birth, activity, faults, and misapprehension — on the successive annihilation of these in the reverse order, there follows release (apavarga).",
ex:"Ignorance causes faults (desire/aversion). Faults cause action (karma). Action causes birth. Birth causes suffering. Remove ignorance, and the entire chain collapses like dominos."
}}
]}
]}
];"""

source = 'Temp/patanjali_yoga_sutras_complete_map_2.html'
process_file(source, 'Temp/samkhya_map.html', 'Samkhya Karika — Map', 'Overview of Samkhya Philosophy', samkhya_data)
process_file(source, 'Temp/nyaya_sutras_map.html', 'Nyaya Sutras — Map', 'Overview of Nyaya Logic & Epistemology', nyaya_data)
print("Files generated successfully.")
