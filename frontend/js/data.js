/**
 * data.js — City Database & Fallback ML Engine
 * SmartCity AI · India Urban Intelligence
 *
 * Exports (global): CITIES, ZONES, CITY_FACTS, PLACE_DB, fb(), greenIdx()
 */

/* ══════════════ CITY DATABASE ══════════════ */
const CITIES = {
  Mumbai:       {lat:19.076, lng:72.877, p0:18.4, t0:68, a0:148, pr:.38, tr:.31, ar:.72},
  Delhi:        {lat:28.614, lng:77.209, p0:28.5, t0:82, a0:198, pr:.45, tr:.40, ar:1.05},
  Bangalore:    {lat:12.971, lng:77.594, p0:8.4,  t0:58, a0:62,  pr:.52, tr:.35, ar:.42},
  Hyderabad:    {lat:17.385, lng:78.486, p0:7.7,  t0:62, a0:75,  pr:.42, tr:.33, ar:.55},
  Chennai:      {lat:13.082, lng:80.270, p0:7.1,  t0:55, a0:78,  pr:.35, tr:.28, ar:.48},
  Kolkata:      {lat:22.572, lng:88.363, p0:14.8, t0:72, a0:145, pr:.22, tr:.25, ar:.85},
  Pune:         {lat:18.520, lng:73.856, p0:3.1,  t0:52, a0:68,  pr:.58, tr:.38, ar:.45},
  Ahmedabad:    {lat:23.022, lng:72.571, p0:6.0,  t0:60, a0:92,  pr:.40, tr:.32, ar:.62},
  Jaipur:       {lat:26.912, lng:75.787, p0:3.1,  t0:48, a0:88,  pr:.38, tr:.28, ar:.55},
  Surat:        {lat:21.170, lng:72.831, p0:4.6,  t0:50, a0:80,  pr:.50, tr:.30, ar:.50},
  Lucknow:      {lat:26.847, lng:80.947, p0:3.2,  t0:55, a0:140, pr:.40, tr:.32, ar:.90},
  Kanpur:       {lat:26.449, lng:80.331, p0:2.9,  t0:60, a0:155, pr:.28, tr:.30, ar:.95},
  Nagpur:       {lat:21.145, lng:79.088, p0:2.4,  t0:50, a0:78,  pr:.35, tr:.28, ar:.52},
  Bhopal:       {lat:23.259, lng:77.413, p0:1.9,  t0:48, a0:72,  pr:.38, tr:.26, ar:.48},
  Patna:        {lat:25.594, lng:85.137, p0:2.1,  t0:65, a0:165, pr:.42, tr:.35, ar:1.10},
  Vadodara:     {lat:22.307, lng:73.181, p0:1.7,  t0:46, a0:68,  pr:.42, tr:.28, ar:.44},
  Coimbatore:   {lat:11.001, lng:76.965, p0:1.1,  t0:44, a0:55,  pr:.35, tr:.24, ar:.38},
  Visakhapatnam:{lat:17.686, lng:83.218, p0:2.0,  t0:52, a0:72,  pr:.38, tr:.30, ar:.48},
  Indore:       {lat:22.719, lng:75.857, p0:2.2,  t0:54, a0:82,  pr:.45, tr:.32, ar:.55},
  Chandigarh:   {lat:30.733, lng:76.779, p0:1.1,  t0:42, a0:62,  pr:.28, tr:.22, ar:.40},
};

/* City quick-facts for the info panel */
const CITY_FACTS = {
  Mumbai:       {state:'Maharashtra',pop2024:'21.7M',area:'603 km\u00B2',density:'36,000/km\u00B2',famous:'Gateway of India, Bollywood',desc:'India\u2019s financial capital and most populous metro. Home to Bollywood, the BSE, and one of the busiest ports.'},
  Delhi:        {state:'Delhi',pop2024:'33.8M',area:'1,484 km\u00B2',density:'22,800/km\u00B2',famous:'Red Fort, India Gate',desc:'India\u2019s capital territory. A historic city with Mughal-era monuments and one of the highest population densities.'},
  Bangalore:    {state:'Karnataka',pop2024:'13.2M',area:'741 km\u00B2',density:'17,800/km\u00B2',famous:'IT Hub, Lalbagh Garden',desc:'India\u2019s Silicon Valley. The nation\u2019s leading IT and startup hub with a pleasant climate.'},
  Hyderabad:    {state:'Telangana',pop2024:'10.5M',area:'650 km\u00B2',density:'16,200/km\u00B2',famous:'Charminar, Golconda Fort',desc:'City of Pearls and Biryani. A booming pharma and IT hub blending heritage with modern infrastructure.'},
  Chennai:      {state:'Tamil Nadu',pop2024:'11.5M',area:'426 km\u00B2',density:'27,000/km\u00B2',famous:'Marina Beach, Temples',desc:'Gateway to South India. Major automobile hub (\u201cDetroit of India\u201d) with rich classical arts tradition.'},
  Kolkata:      {state:'West Bengal',pop2024:'15.6M',area:'205 km\u00B2',density:'76,000/km\u00B2',famous:'Victoria Memorial, Howrah Bridge',desc:'City of Joy. Former British capital known for literary heritage, Durga Puja, and cultural institutions.'},
  Pune:         {state:'Maharashtra',pop2024:'8.1M',area:'331 km\u00B2',density:'24,500/km\u00B2',famous:'Shaniwar Wada, Osho Ashram',desc:'Oxford of the East. A major education and IT hub with pleasant climate and growing auto sector.'},
  Ahmedabad:    {state:'Gujarat',pop2024:'8.6M',area:'505 km\u00B2',density:'17,000/km\u00B2',famous:'Sabarmati Ashram, Stepwells',desc:'India\u2019s first UNESCO World Heritage City, known for textiles, street food, and vibrant culture.'},
  Jaipur:       {state:'Rajasthan',pop2024:'3.9M',area:'467 km\u00B2',density:'8,400/km\u00B2',famous:'Hawa Mahal, Amber Fort',desc:'The Pink City. Rajasthan\u2019s capital with stunning Rajput architecture and colorful bazaars.'},
  Surat:        {state:'Gujarat',pop2024:'7.4M',area:'326 km\u00B2',density:'22,700/km\u00B2',famous:'Diamond Capital, Textiles',desc:'Diamond City of India. Processes 90% of the world\u2019s diamonds and is one of the fastest-growing cities.'},
  Lucknow:      {state:'Uttar Pradesh',pop2024:'3.7M',area:'349 km\u00B2',density:'10,600/km\u00B2',famous:'Bara Imambara, Awadhi Cuisine',desc:'City of Nawabs. Known for refined culture, Awadhi cuisine, and Mughal-era architecture.'},
  Kanpur:       {state:'Uttar Pradesh',pop2024:'3.2M',area:'315 km\u00B2',density:'10,200/km\u00B2',famous:'Leather Industry, IIT Kanpur',desc:'Industrial capital of UP. Major leather and textile manufacturing hub on the Ganges.'},
  Nagpur:       {state:'Maharashtra',pop2024:'2.9M',area:'267 km\u00B2',density:'10,900/km\u00B2',famous:'Orange City, Deekshabhoomi',desc:'Geographic centre of India and Maharashtra\u2019s third-largest city with major mining industries.'},
  Bhopal:       {state:'Madhya Pradesh',pop2024:'2.0M',area:'463 km\u00B2',density:'4,300/km\u00B2',famous:'City of Lakes, Taj-ul-Masajid',desc:'Capital of MP known for its lakes, Mughal heritage, and the 1984 industrial tragedy memorial.'},
  Patna:        {state:'Bihar',pop2024:'2.5M',area:'136 km\u00B2',density:'18,400/km\u00B2',famous:'Ancient Pataliputra',desc:'One of the oldest continuously inhabited cities. Ancient capital of the Maurya Empire.'},
  Vadodara:     {state:'Gujarat',pop2024:'2.3M',area:'161 km\u00B2',density:'14,300/km\u00B2',famous:'Laxmi Vilas Palace',desc:'Cultural Capital of Gujarat. Known for palaces, universities, and Navratri celebrations.'},
  Coimbatore:   {state:'Tamil Nadu',pop2024:'1.9M',area:'246 km\u00B2',density:'7,700/km\u00B2',famous:'Manchester of South India',desc:'Textile Capital of South India. Major engineering hub with pleasant hill-station climate.'},
  Visakhapatnam:{state:'Andhra Pradesh',pop2024:'2.3M',area:'540 km\u00B2',density:'4,300/km\u00B2',famous:'Submarine Museum, Beaches',desc:'City of Destiny. Major port city with steel plants, IT SEZs, and beautiful beaches.'},
  Indore:       {state:'Madhya Pradesh',pop2024:'3.0M',area:'530 km\u00B2',density:'5,700/km\u00B2',famous:'Cleanest City Award, Food',desc:'India\u2019s cleanest city (multiple Swachh Bharat awards) with thriving education and food culture.'},
  Chandigarh:   {state:'Chandigarh (UT)',pop2024:'1.2M',area:'114 km\u00B2',density:'10,500/km\u00B2',famous:'Le Corbusier, Rock Garden',desc:'The City Beautiful. India\u2019s best-planned city designed by Le Corbusier, joint capital of Punjab & Haryana.'},
};

/* ══════════════ PLACE DATABASE ══════════════ */
const PLACE_DB = {
  Mumbai: [
    {n:'Gateway of India',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Gateway_of_India_Mumbai.jpg/330px-Gateway_of_India_Mumbai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Monument',c:'#d97706',la:18.9220,lo:72.8347},
    {n:'Marine Drive',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Marine_Drive_Mumbai.jpg/330px-Marine_Drive_Mumbai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf0a',t:'Landmark',c:'#1a56db',la:18.9432,lo:72.8234},
    {n:'Chhatrapati Shivaji Terminus',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6d/Chhatrapati_Shivaji_Maharaj_Terminus_at_night%2C_Mumbai%2C_Maharashtra%2C_India_%282013%29_1.jpg/330px-Chhatrapati_Shivaji_Maharaj_Terminus_at_night%2C_Mumbai%2C_Maharashtra%2C_India_%282013%29_1.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\ude82',t:'Heritage',c:'#7c3aed',la:18.9398,lo:72.8355},
    {n:'Elephanta Caves',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/51/Elephanta_Caves_Mumbai.jpg/330px-Elephanta_Caves_Mumbai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf1f',t:'Heritage',c:'#059669',la:18.9634,lo:72.9315},
    {n:'Siddhivinayak Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b9/Shree_Siddhivinayak_Temple_Mumbai.jpg/330px-Shree_Siddhivinayak_Temple_Mumbai.jpg',e:'\ud83d\ude4f',t:'Temple',c:'#dc2626',la:19.0169,lo:72.8307},
    {n:'Juhu Beach',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9a/Juhu_beach_2019.jpg/330px-Juhu_beach_2019.jpg',e:'\ud83c\udf0d',t:'Beach',c:'#0284c7',la:19.0948,lo:72.8267},
  ],
  Delhi: [
    {n:'India Gate',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/India_Gate_in_New_Delhi.jpg/330px-India_Gate_in_New_Delhi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Monument',c:'#d97706',la:28.6129,lo:77.2295},
    {n:'Red Fort',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/Red_Fort_in_Delhi_03-2016_img3.jpg/330px-Red_Fort_in_Delhi_03-2016_img3.jpg',e:'\ud83c\udff0',t:'Heritage',c:'#dc2626',la:28.6562,lo:77.2410},
    {n:'Qutub Minar',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ef/Qutub_Minar_6.jpg/330px-Qutub_Minar_6.jpg',e:'\ud83c\udfef',t:'Heritage',c:'#1a56db',la:28.5244,lo:77.1855},
    {n:'Lotus Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Lotus_Temple_in_New_Delhi_03-2016.jpg/330px-Lotus_Temple_in_New_Delhi_03-2016.jpg',e:'\ud83c\udf38',t:'Temple',c:'#a855f7',la:28.5535,lo:77.2588},
    {n:'Humayun Tomb',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cc/Humayun%27s_Tomb_-_New_Delhi.jpg/330px-Humayun%27s_Tomb_-_New_Delhi.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf1f',t:'Heritage',c:'#059669',la:28.5933,lo:77.2507},
    {n:'Akshardham Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Akshardham_Delhi.jpg/330px-Akshardham_Delhi.jpg',e:'\ud83d\ude4f',t:'Temple',c:'#f97316',la:28.6127,lo:77.2773},
  ],
  Bangalore: [
    {n:'Lalbagh Botanical Garden',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Lalbagh_Botanical_Garden.jpg/330px-Lalbagh_Botanical_Garden.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf3f',t:'Garden',c:'#16a34a',la:12.9507,lo:77.5848},
    {n:'Bangalore Palace',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/Aerial_view_of_Bangalore_Palace_and_Palace_Grounds_%282%29.jpg/330px-Aerial_view_of_Bangalore_Palace_and_Palace_Grounds_%282%29.jpg',e:'\ud83c\udff0',t:'Heritage',c:'#7c3aed',la:12.9987,lo:77.5921},
    {n:'Cubbon Park',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Cubbon_Park_Bangalore.jpg/330px-Cubbon_Park_Bangalore.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf32',t:'Park',c:'#059669',la:12.9763,lo:77.5929},
    {n:'ISCON Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6c/ISKCON_Temple_Bangalore.jpg/330px-ISKCON_Temple_Bangalore.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\ude4f',t:'Temple',c:'#dc2626',la:13.0105,lo:77.5510},
    {n:'Vidhana Soudha',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/Vidhana_Soudha_Bangalore.jpg/330px-Vidhana_Soudha_Bangalore.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Government',c:'#1a56db',la:12.9791,lo:77.5913},
  ],
  Hyderabad: [
    {n:'Charminar',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/71/Charminar_Hyderabad_1.jpg/330px-Charminar_Hyderabad_1.jpg',e:'\ud83d\udd4c',t:'Monument',c:'#d97706',la:17.3616,lo:78.4747},
    {n:'Golconda Fort',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0a/Golconda_Fort.jpg/330px-Golconda_Fort.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udff0',t:'Fortress',c:'#dc2626',la:17.3833,lo:78.4011},
    {n:'Hussain Sagar Lake',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Hussain_Sagar_Buddha_Statue.JPG/330px-Hussain_Sagar_Buddha_Statue.JPG',e:'\ud83c\udfde\ufe0f',t:'Lake',c:'#1a56db',la:17.4239,lo:78.4738},
    {n:'Ramoji Film City',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Ramoji_Film_City.jpg/330px-Ramoji_Film_City.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfac',t:'Entertainment',c:'#7c3aed',la:17.2543,lo:78.6808},
    {n:'Qutb Shahi Tombs',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/Qutb_Shahi_Tombs_Hyderabad.jpg/330px-Qutb_Shahi_Tombs_Hyderabad.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf1f',t:'Heritage',c:'#059669',la:17.3935,lo:78.3975},
    {n:'Birla Mandir',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Birla_Mandir_Hyderabad.jpg/330px-Birla_Mandir_Hyderabad.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\ude4f',t:'Temple',c:'#f97316',la:17.4062,lo:78.4691},
  ],
  Chennai: [
    {n:'Marina Beach',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c1/Marina_Beach%2C_Chennai.jpg/330px-Marina_Beach%2C_Chennai.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf0d',t:'Beach',c:'#1a56db',la:13.0499,lo:80.2824},
    {n:'Kapaleeshwarar Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/6f/Chennai_Kapaleeshwarar_Temple.jpg/330px-Chennai_Kapaleeshwarar_Temple.jpg',e:'\ud83d\udee5\ufe0f',t:'Temple',c:'#d97706',la:13.0338,lo:80.2699},
    {n:'Fort St George',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Fort_St._George%2C_Chennai.jpg/330px-Fort_St._George%2C_Chennai.jpg',e:'\ud83c\udff0',t:'Heritage',c:'#dc2626',la:13.0800,lo:80.2880},
    {n:'Santhome Cathedral',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b8/Santhome_Cathedral.jpg/330px-Santhome_Cathedral.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\u271d\ufe0f',t:'Church',c:'#7c3aed',la:13.0335,lo:80.2785},
    {n:'Guindy National Park',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c9/Guindy_national_park.jpg/330px-Guindy_national_park.jpg',e:'\ud83c\udf33',t:'Park',c:'#059669',la:13.0050,lo:80.2360},
  ],
  Kolkata: [
    {n:'Victoria Memorial',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/47/Victoria_Memorial_Kolkata.jpg/330px-Victoria_Memorial_Kolkata.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Monument',c:'#7c3aed',la:22.5448,lo:88.3426},
    {n:'Howrah Bridge',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/80/Howrah_Bridge_Kolkata.jpg/330px-Howrah_Bridge_Kolkata.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf09',t:'Bridge',c:'#1a56db',la:22.5851,lo:88.3468},
    {n:'Dakshineswar Kali Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Dakshineswar_Kali_Temple.jpg/330px-Dakshineswar_Kali_Temple.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\ude4f',t:'Temple',c:'#dc2626',la:22.6548,lo:88.3572},
    {n:'Indian Museum',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/67/Indian_Museum_Kolkata.jpg/330px-Indian_Museum_Kolkata.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfaa',t:'Museum',c:'#d97706',la:22.5579,lo:88.3510},
    {n:'St. Pauls Cathedral',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/44/St._Paul%27s_Cathedral_Kolkata.jpg/330px-St._Paul%27s_Cathedral_Kolkata.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\u271d\ufe0f',t:'Church',c:'#059669',la:22.5411,lo:88.3474},
  ],
  Pune: [
    {n:'Shaniwar Wada',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f8/Shaniwarwada_fort%2C_Pune.jpg/330px-Shaniwarwada_fort%2C_Pune.jpg',e:'\ud83c\udff0',t:'Fortress',c:'#d97706',la:18.5195,lo:73.8553},
    {n:'Aga Khan Palace',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/25/Aga_Khan_Palace.jpg/330px-Aga_Khan_Palace.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Heritage',c:'#16a34a',la:18.5522,lo:73.9027},
    {n:'Sinhagad Fort',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/15/Sinhagad_Fort.jpg/330px-Sinhagad_Fort.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udff0',t:'Fortress',c:'#dc2626',la:18.3663,lo:73.7556},
    {n:'Dagdusheth Halwai Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/65/Dagadusheth_Halwai_Sarvajanik_Ganeshotsav_Mandal.jpg/330px-Dagadusheth_Halwai_Sarvajanik_Ganeshotsav_Mandal.jpg',e:'\ud83d\ude4f',t:'Temple',c:'#7c3aed',la:18.5160,lo:73.8560},
    {n:'Raja Dinkar Kelkar Museum',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b3/Raja_Dinkar_Kelkar_Museum.jpg/330px-Raja_Dinkar_Kelkar_Museum.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfaa',t:'Museum',c:'#1a56db',la:18.5074,lo:73.8524},
  ],
  Ahmedabad: [
    {n:'Sabarmati Ashram',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Sabarmati_Ashram.jpg/330px-Sabarmati_Ashram.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Heritage',c:'#16a34a',la:23.0608,lo:72.5797},
    {n:'Adalaj Stepwell',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/41/Adalaj_Stepwell.jpg/330px-Adalaj_Stepwell.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Heritage',c:'#7c3aed',la:23.1632,lo:72.5807},
    {n:'Siddi Saiyyed Mosque',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Siddi_Saiyad_Carved_Net.JPG/330px-Siddi_Saiyad_Carved_Net.JPG',e:'\ud83d\udd4c',t:'Mosque',c:'#d97706',la:23.0225,lo:72.5801},
    {n:'Jama Masjid',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b2/Jama_Masjid_Ahmedabad.jpg/330px-Jama_Masjid_Ahmedabad.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\udd4c',t:'Mosque',c:'#dc2626',la:23.0244,lo:72.5820},
    {n:'Kankaria Lake',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a1/Supply_sluice_of_Kankaria_Lake_Ahmedabad_1866.jpg/330px-Supply_sluice_of_Kankaria_Lake_Ahmedabad_1866.jpg',e:'\ud83c\udfde\ufe0f',t:'Lake',c:'#0284c7',la:23.0070,lo:72.5965},
  ],
  Jaipur: [
    {n:'Hawa Mahal',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c3/Hawa_Mahal_Jaipur.jpg/330px-Hawa_Mahal_Jaipur.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Palace',c:'#dc2626',la:26.9239,lo:75.8267},
    {n:'Amber Fort',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/94/Amber_Fort_Jaipur.jpg/330px-Amber_Fort_Jaipur.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udff0',t:'Fortress',c:'#d97706',la:26.9855,lo:75.8513},
    {n:'City Palace',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/48/City_Palace_Jaipur.jpg/330px-City_Palace_Jaipur.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udff0',t:'Palace',c:'#7c3aed',la:26.9258,lo:75.8237},
    {n:'Jantar Mantar',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Jantar_Mantar_Jaipur.jpg/330px-Jantar_Mantar_Jaipur.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf1f',t:'Heritage',c:'#059669',la:26.9247,lo:75.8245},
    {n:'Nahargarh Fort',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/ed/Nahargarh_Fort_Jaipur.jpg/330px-Nahargarh_Fort_Jaipur.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udff0',t:'Fortress',c:'#1a56db',la:26.9387,lo:75.8154},
  ],
  Surat: [
    {n:'Dutch Garden',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/LRM_EXPORT_20170723_065330.jpg/330px-LRM_EXPORT_20170723_065330.jpg',e:'\ud83c\udf3f',t:'Garden',c:'#16a34a',la:21.1702,lo:72.8311},
    {n:'Dumas Beach',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9c/Dumas_Beach_Surat.jpg/330px-Dumas_Beach_Surat.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf0d',t:'Beach',c:'#0284c7',la:21.0958,lo:72.7262},
    {n:'Surat Castle',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2e/Surat_Fort%2C_front_View.jpg/330px-Surat_Fort%2C_front_View.jpg',e:'\ud83c\udff0',t:'Fortress',c:'#d97706',la:21.2021,lo:72.8224},
    {n:'Hazira Port',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e3/Hazira_Maqbara_during_Emperor_Akbar_In_Vadodara.JPG/330px-Hazira_Maqbara_during_Emperor_Akbar_In_Vadodara.JPG',e:'\u26f5',t:'Port',c:'#1a56db',la:21.1048,lo:72.6286},
    {n:'Science Centre',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Hardwicke%27s_Science-Gossip_-_Volume_2.pdf/page1-330px-Hardwicke%27s_Science-Gossip_-_Volume_2.pdf.jpg',e:'\ud83d\udd2c',t:'Museum',c:'#7c3aed',la:21.1484,lo:72.7743},
  ],
  Lucknow: [
    {n:'Bara Imambara',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Bara_Imambara_Lucknow.jpg/330px-Bara_Imambara_Lucknow.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\udd4c',t:'Monument',c:'#d97706',la:26.8692,lo:80.9132},
    {n:'Rumi Darwaza',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/73/Rumi_Darwaza_Lucknow.jpg/330px-Rumi_Darwaza_Lucknow.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Monument',c:'#dc2626',la:26.8680,lo:80.9155},
    {n:'British Residency',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1f/Imambara_inside_the_Residency-Lucknow-Uttar_Pradesh-DSC_0001.jpg/330px-Imambara_inside_the_Residency-Lucknow-Uttar_Pradesh-DSC_0001.jpg',e:'\ud83c\udf1f',t:'Heritage',c:'#1a56db',la:26.8580,lo:80.9162},
    {n:'Chota Imambara',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Chhota_imambara_Lucknow.jpg/330px-Chhota_imambara_Lucknow.jpg',e:'\ud83d\udd4c',t:'Monument',c:'#7c3aed',la:26.8698,lo:80.9146},
    {n:'Hazratganj Market',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1e/Hazratganj_Lucknow.jpg/330px-Hazratganj_Lucknow.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\uded2',t:'Market',c:'#059669',la:26.8547,lo:80.9462},
  ],
  Kanpur: [
    {n:'Allen Forest Zoo',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d1/Kanpur_Zoological_Park_%2897640%29.jpg/330px-Kanpur_Zoological_Park_%2897640%29.jpg',e:'\ud83e\udd81',t:'Zoo',c:'#16a34a',la:26.4499,lo:80.3319},
    {n:'Kanpur Memorial Church',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Kanpur_Memorial_Church.jpg/330px-Kanpur_Memorial_Church.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\u271d\ufe0f',t:'Church',c:'#7c3aed',la:26.4718,lo:80.3463},
    {n:'Jain Glass Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Nasiyan_Jain_Temple.jpg/330px-Nasiyan_Jain_Temple.jpg',e:'\ud83d\ude4f',t:'Temple',c:'#d97706',la:26.4390,lo:80.2897},
    {n:'Moti Jheel',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/af/Moti_Jheel_metro_station.jpg/330px-Moti_Jheel_metro_station.jpg',e:'\ud83c\udfde\ufe0f',t:'Lake',c:'#0284c7',la:26.4545,lo:80.3346},
    {n:'Bithoor',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/16/Ganga_river_at_bithoor_Kanpur.jpg/330px-Ganga_river_at_bithoor_Kanpur.jpg',e:'\ud83c\udf3f',t:'Heritage',c:'#059669',la:26.6083,lo:80.2642},
  ],
  Nagpur: [
    {n:'Deekshabhoomi',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/Stupa_at_Nagpur.jpg/330px-Stupa_at_Nagpur.jpg',e:'\u2638\ufe0f',t:'Sacred Site',c:'#7c3aed',la:21.1254,lo:79.0415},
    {n:'Nagpur Zoo (Maharajbagh)',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/db/A_view_of_Maharajbag%2C_Nagpur.jpg/330px-A_view_of_Maharajbag%2C_Nagpur.jpg',e:'\ud83e\udd81',t:'Zoo',c:'#16a34a',la:21.1353,lo:79.0625},
    {n:'Futala Lake',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Futala_Lake%2C_Nagpur_3.jpg/330px-Futala_Lake%2C_Nagpur_3.jpg',e:'\ud83c\udfde\ufe0f',t:'Lake',c:'#0284c7',la:21.1458,lo:79.0320},
    {n:'Sitabuldi Fort',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4c/Sitabuldi_fort_gate.JPG/330px-Sitabuldi_fort_gate.JPG',e:'\ud83c\udff0',t:'Fortress',c:'#dc2626',la:21.1396,lo:79.0783},
    {n:'Raman Science Centre',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/90/Raman_Science_Centre_Nagpur.jpg/330px-Raman_Science_Centre_Nagpur.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\udd2c',t:'Museum',c:'#d97706',la:21.1445,lo:79.0750},
  ],
  Bhopal: [
    {n:'Taj-ul-Masajid',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f3/Taj-ul-Masajid%2C_Bhopal.jpg/330px-Taj-ul-Masajid%2C_Bhopal.jpg',e:'\ud83d\udd4c',t:'Mosque',c:'#d97706',la:23.2725,lo:77.4108},
    {n:'Upper Lake',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/ca/Upper_Lake%2C_Bhopal%2C_M.P.jpg/330px-Upper_Lake%2C_Bhopal%2C_M.P.jpg',e:'\ud83c\udfde\ufe0f',t:'Lake',c:'#0284c7',la:23.2323,lo:77.3910},
    {n:'Bhimbetka Rock Shelters',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8c/Bhimbetka_Rock_Shelters.jpg/330px-Bhimbetka_Rock_Shelters.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf1f',t:'Heritage',c:'#059669',la:23.0406,lo:77.6115},
    {n:'Sanchi Stupa',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cb/Sanchi_Stupa%2C_Bhopal%2C_Inda_16.JPG/330px-Sanchi_Stupa%2C_Bhopal%2C_Inda_16.JPG',e:'\u2638\ufe0f',t:'Heritage',c:'#7c3aed',la:23.4793,lo:77.7397},
    {n:'Van Vihar National Park',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/34/Blackbuck_in_Van_Vihar_National_Park_Bhopal_%282%29.jpg/330px-Blackbuck_in_Van_Vihar_National_Park_Bhopal_%282%29.jpg',e:'\ud83c\udf32',t:'Park',c:'#16a34a',la:23.2344,lo:77.4010},
  ],
  Patna: [
    {n:'Golghar',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/Golghar%2C_Patna.jpg/330px-Golghar%2C_Patna.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfdb\ufe0f',t:'Heritage',c:'#1a56db',la:25.6185,lo:85.1398},
    {n:'Mahavir Mandir',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/24/Mahavir_Mandir_Patna%2C_Patna_Junction%2C_Bihar_INDIA.jpg/330px-Mahavir_Mandir_Patna%2C_Patna_Junction%2C_Bihar_INDIA.jpg',e:'\ud83d\ude4f',t:'Temple',c:'#dc2626',la:25.6022,lo:85.1352},
    {n:'Patna Museum',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/ba/Patna_Museum.jpg/330px-Patna_Museum.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfaa',t:'Museum',c:'#d97706',la:25.6192,lo:85.1034},
    {n:'Buddha Smriti Park',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/Buddha_Smriti_Park_Patna.jpg/330px-Buddha_Smriti_Park_Patna.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\u2638\ufe0f',t:'Park',c:'#059669',la:25.6148,lo:85.1218},
    {n:'Bihar Museum',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/7/76/The_Prime_Minister%2C_Shri_Narendra_Modi_visiting_the_Bihar_Museum%2C_in_Patna_%286%29.jpg/330px-The_Prime_Minister%2C_Shri_Narendra_Modi_visiting_the_Bihar_Museum%2C_in_Patna_%286%29.jpg',e:'\ud83c\udfaa',t:'Museum',c:'#7c3aed',la:25.6090,lo:85.0940},
  ],
  Vadodara: [
    {n:'Laxmi Vilas Palace',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/05/Laxmi_Vilas_Palace.jpg/330px-Laxmi_Vilas_Palace.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udff0',t:'Palace',c:'#7c3aed',la:22.3072,lo:73.1812},
    {n:'Sayaji Baug',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Sayaji_Baug_Plaque.jpg/330px-Sayaji_Baug_Plaque.jpg',e:'\ud83c\udf33',t:'Garden',c:'#16a34a',la:22.3130,lo:73.1810},
    {n:'Kirti Mandir',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dc/Kirti_Mandir-1.jpg/330px-Kirti_Mandir-1.jpg',e:'\ud83c\udfdb\ufe0f',t:'Memorial',c:'#d97706',la:22.3046,lo:73.1893},
    {n:'Maharaja Fateh Singh Museum',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Baroda_Museum_exterior.jpg/330px-Baroda_Museum_exterior.jpg',e:'\ud83c\udfaa',t:'Museum',c:'#1a56db',la:22.3100,lo:73.1820},
    {n:'Champaner-Pavagadh',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/12/Jami_Masjid_-_Champaner-Pavagadh_Archaeological_Park_-_Gujarat_-_DSC027.jpg/330px-Jami_Masjid_-_Champaner-Pavagadh_Archaeological_Park_-_Gujarat_-_DSC027.jpg',e:'\ud83c\udf1f',t:'Heritage',c:'#dc2626',la:22.4845,lo:73.5340},
  ],
  Coimbatore: [
    {n:'Marudhamalai Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4a/Marudhamalai_Murugan_Temple%2C_Coimbatore.jpg/330px-Marudhamalai_Murugan_Temple%2C_Coimbatore.jpg',e:'\ud83d\udee5\ufe0f',t:'Temple',c:'#d97706',la:11.0352,lo:76.8952},
    {n:'Siruvani Dam',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a5/Siruvani_Dam_%283169486653%29.jpg/330px-Siruvani_Dam_%283169486653%29.jpg',e:'\ud83c\udfde\ufe0f',t:'Dam',c:'#0284c7',la:11.1390,lo:76.7560},
    {n:'VOC Park & Zoo',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/93/Voc_Park_Front_View.jpg/330px-Voc_Park_Front_View.jpg',e:'\ud83e\udd81',t:'Zoo',c:'#16a34a',la:11.0050,lo:76.9710},
    {n:'Perur Pateeswarar Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Perur_Temple.jpg/330px-Perur_Temple.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\ude4f',t:'Temple',c:'#7c3aed',la:10.9960,lo:76.8990},
    {n:'Forest College Museum',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a7/Panicum_maximum%2C_grass_in_Coimbatore_Forest_College_campus%2C_AJT_Johnsingh._4th_November_2019._DSCN8677.jpg/330px-Panicum_maximum%2C_grass_in_Coimbatore_Forest_College_campus%2C_AJT_Johnsingh._4th_November_2019._DSCN8677.jpg',e:'\ud83c\udfaa',t:'Museum',c:'#059669',la:11.0168,lo:76.9558},
  ],
  Visakhapatnam: [
    {n:'RK Beach',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0e/RK_Beach_Vizag.jpg/330px-RK_Beach_Vizag.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf0d',t:'Beach',c:'#0284c7',la:17.7833,lo:83.3811},
    {n:'Submarine Museum (INS Kursura)',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/46/INS_Kursura.jpg/330px-INS_Kursura.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\ude42',t:'Museum',c:'#1a56db',la:17.7754,lo:83.3840},
    {n:'Kailasagiri Hill Park',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fc/Kailasagiri_ropeway_line_in_Vizag_02.jpg/330px-Kailasagiri_ropeway_line_in_Vizag_02.jpg',e:'\ud83c\udfde\ufe0f',t:'Park',c:'#16a34a',la:17.7860,lo:83.3650},
    {n:'Simhachalam Temple',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Simhachalam_Temple.jpg/330px-Simhachalam_Temple.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83d\ude4f',t:'Temple',c:'#dc2626',la:17.7650,lo:83.2550},
    {n:'Yarada Beach',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Beaches_of_Vizag_04.jpg/330px-Beaches_of_Vizag_04.jpg',e:'\ud83c\udf0d',t:'Beach',c:'#d97706',la:17.6590,lo:83.2610},
  ],
  Indore: [
    {n:'Rajwada Palace',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/43/Rajwada_Indore.jpg/330px-Rajwada_Indore.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udff0',t:'Palace',c:'#d97706',la:22.7179,lo:75.8573},
    {n:'Lal Bagh Palace',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2c/Lal_Bagh_Palace.jpg/330px-Lal_Bagh_Palace.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udff0',t:'Palace',c:'#7c3aed',la:22.6953,lo:75.8165},
    {n:'Patalpani Waterfall',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c5/PATALPANI_WATERFALL_INDORE_WALLPAPER.jpg/330px-PATALPANI_WATERFALL_INDORE_WALLPAPER.jpg',e:'\ud83c\udf0a',t:'Waterfall',c:'#0284c7',la:22.5035,lo:75.7450},
    {n:'Kamla Nehru Zoo',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0c/Indore_zoo_gate.jpg/330px-Indore_zoo_gate.jpg',e:'\ud83e\udd81',t:'Zoo',c:'#16a34a',la:22.6980,lo:75.8530},
    {n:'Anand Mohan Mathur Garden',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/42/Gandhi_hall_indore.jpg/330px-Gandhi_hall_indore.jpg',e:'\ud83c\udf3f',t:'Garden',c:'#059669',la:22.7176,lo:75.8563},
  ],
  Chandigarh: [
    {n:'Rock Garden',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Rock_Garden_Chandigarh.jpg/330px-Rock_Garden_Chandigarh.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfa8',t:'Garden',c:'#16a34a',la:30.7525,lo:76.8108},
    {n:'Sukhna Lake',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Sukhna_Lake.jpg/330px-Sukhna_Lake.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udfde\ufe0f',t:'Lake',c:'#0284c7',la:30.7420,lo:76.8176},
    {n:'Rose Garden',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Rose_Garden_Chandigarh.jpg/330px-Rose_Garden_Chandigarh.jpg?utm_source=commons.wikimedia.org&utm_campaign=imageinfo&utm_content=thumbnail',e:'\ud83c\udf39',t:'Garden',c:'#dc2626',la:30.7460,lo:76.7900},
    {n:'Pinjore Gardens',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e2/Pinjore_Gardens_at_night.jpg/330px-Pinjore_Gardens_at_night.jpg',e:'\ud83c\udf33',t:'Garden',c:'#059669',la:30.8150,lo:76.9160},
    {n:'Chandigarh Capitol Complex',img:'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1a/Palace_of_Assembly_Chandigarh_2006.jpg/330px-Palace_of_Assembly_Chandigarh_2006.jpg',e:'\ud83c\udfdb\ufe0f',t:'Heritage',c:'#7c3aed',la:30.7580,lo:76.8090},
  ],
};

/* ══════════════ ZONES ══════════════ */
const ZONES=[
  {n:'Central Business', lo:.00, go:.00, tm:1.00,am:1.00,pm:1.00},
  {n:'North Residential', lo:.07, go:-.04, tm:.72,am:.78,pm:.85},
  {n:'Industrial Zone', lo:-.06,go:.08, tm:.65,am:1.40,pm:.55},
  {n:'South Area', lo:-.09,go:-.02, tm:.60,am:.72,pm:.70},
  {n:'East Tech Park', lo:.04, go:.11, tm:.82,am:.58,pm:1.10},
  {n:'West Suburbs', lo:.05, go:-.12,tm:.50,am:.48,pm:1.15},
  {n:'Airport Corridor', lo:.10, go:.09, tm:1.12,am:1.22,pm:.45},
  {n:'University Area', lo:-.04,go:-.10,tm:.78,am:.52,pm:.88},
  {n:'Medical Hub', lo:.02, go:-.07,tm:.88,am:.62,pm:.75},
  {n:'Heritage Zone', lo:-.03,go:.05, tm:.95,am:.85,pm:.92},
];


/* ══════════════ FALLBACK ML ══════════════ */
// Simple seeded PRNG (mulberry32) so fb() is deterministic per inputs
function _seedRng(seed){
  return function(){
    seed|=0;seed=seed+0x6D2B79F5|0;
    let t=Math.imul(seed^seed>>>15,1|seed);
    t=t+Math.imul(t^t>>>7,61|t)^t;
    return((t^t>>>14)>>>0)/4294967296;
  };
}
function _hashStr(s){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h)+s.charCodeAt(i);h|=0;}return h;}

function fb(city,year,feat,model){
  const c=CITIES[city]||CITIES.Hyderabad, t=year-2000;
  let base,rate;
  if(feat==='traffic'){base=c.t0;rate=c.tr;}
  else if(feat==='aqi'){base=c.a0;rate=c.ar;}
  else{base=c.p0;rate=c.pr;}
  const rng=_seedRng(_hashStr(city+year+feat+model));
  const n=(rng()-.5)*(model==='LR'?.015:.055);
  let v;
  if(model==='LR')v=base+rate*t+.002*t*t;
  else if(model==='RF'){const s=[1,1.2,1.5,1.3,1.1];v=base+rate*t*s[Math.min(4,Math.floor(t/20))]+.003*t*t;}
  else{const sig=1/(1+Math.exp(-.03*(t-40)));v=base+rate*t*(1+.4*sig)+.004*t*t;}
  return Math.max(0,v*(1+n));
}
function greenIdx(city,year){const c=CITIES[city];const rng=_seedRng(_hashStr(city+year+'green'));return Math.max(5,Math.min(65,38-(c.a0/10)-(Math.max(0,c.ar*.15)*(year-2000)/100)+(rng()*3)));}
