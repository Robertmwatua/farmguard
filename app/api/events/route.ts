import { NextResponse } from 'next/server';

export async function GET() {
  const today = new Date();
  
  // Helper to generate dynamic upcoming dates relative to today
  const getUpcomingDateString = (daysAhead: number) => {
    const futureDate = new Date(today);
    futureDate.setDate(today.getDate() + daysAhead);
    return futureDate.toISOString().split('T')[0];
  };

  const dynamicEvents = [
    {
      id: 'evt-1',
      title: 'KALRO Soil Chemistry Clinic & Diagnostics',
      titleSw: 'Kliniki ya Kemia ya Udongo ya KALRO',
      date: getUpcomingDateString(3), // 3 days from now
      location: 'KALRO Regional Centre, Nakuru Town',
      locationSw: 'Kituo cha Mkoa cha KALRO, Nakuru',
      category: 'Soil Clinic',
      categorySw: 'Kliniki ya Udongo',
      organizer: 'Kenya Agricultural & Livestock Research Organization',
      description: 'Bring 1kg of dry soil samples for instant NPK/pH profile analysis, and receive tailored crop spacing blueprints.',
      descriptionSw: 'Leta kilo 1 ya sampuli za udongo kwa uchambuzi wa haraka wa NPK na pH, na upokee maelekezo ya nafasi ya mazao.'
    },
    {
      id: 'evt-2',
      title: 'Nakuru Precision Irrigation & Drip Expo',
      titleSw: 'Maonyesho ya Umwagiliaji wa Matone, Nakuru',
      date: getUpcomingDateString(7), // 7 days from now
      location: 'Agri-Showground Arena, Nakuru',
      locationSw: 'Uwanja wa Maonyesho ya Kilimo, Nakuru',
      category: 'Expo',
      categorySw: 'Maonyesho',
      organizer: 'East Africa Water Efficiency Group',
      description: 'Hands-on demonstrations of battery-free soil moisture tensiometers, solar-powered drip emitters, and multi-crop water scheduling.',
      descriptionSw: 'Mifano ya vitendo ya vifaa vya kupima unyevu wa udongo, matone ya jua, na ratiba ya maji ya mazao mengi.'
    },
    {
      id: 'evt-3',
      title: 'East Africa Organic Farming & IPM Summit',
      titleSw: 'Mkutano wa Kilimo Hai na Uzuiaji Wadudu wa Afrika Mashariki',
      date: getUpcomingDateString(14), // 14 days from now
      location: 'Nairobi AgTech Convention Centre',
      locationSw: 'Kituo cha Mikutano cha Nairobi AgTech',
      category: 'Summit',
      categorySw: 'Mkutano Mkuu',
      organizer: 'Organic Growers Federation Kenya',
      description: 'Keynotes on biological predator introduction, mass Neem oil spray ratios, companion planting, and international organic seed certification standards.',
      descriptionSw: 'Hotuba kuhusu kuanzisha wadudu rafiki, uwiano wa dawa ya mwarobaini, upandaji mseto, na vyeti vya mbegu za kikaboni.'
    },
    {
      id: 'evt-4',
      title: 'Hydroponics & Vertical Greenhouse Workshop',
      titleSw: 'Warsha ya Hydroponics na Vitalu vya Wima',
      date: getUpcomingDateString(21), // 21 days from now
      location: 'Eldoret Seed Breeding Station',
      locationSw: 'Kituo cha Uzalishaji Mbegu cha Eldoret',
      category: 'Workshop',
      categorySw: 'Warsha',
      organizer: 'GreenAgri Solutions East Africa',
      description: 'Practical training on Nutrient Film Technique (NFT) piping channels, coco coir substrate aeration, and active cross-ventilation cycling.',
      descriptionSw: 'Mafunzo ya vitendo ya mifereji ya NFT, mzunguko wa hewa kwenye vitalu, na kutumia coco coir shambani.'
    },
    {
      id: 'evt-5',
      title: 'Small Dairy & Poultry Biosecurity Forum',
      titleSw: 'Jukwaa la Usalama wa Kuku na Ng’ombe wa Maziwa',
      date: getUpcomingDateString(28), // 28 days from now
      location: 'Naivasha Farmers Training Centre',
      locationSw: 'Chuo cha Mafunzo ya Wakulima cha Naivasha',
      category: 'Workshop',
      categorySw: 'Warsha',
      organizer: 'Nakuru Veterinary Council',
      description: 'Proactive training on layer feed calcium formulation ratios, chicken brooder temperature control, and footbath biosecurity shields.',
      descriptionSw: 'Mafunzo ya uwiano wa calcium ya kuku wa mayai, joto la vifaranga, na kuzuia magonjwa ya kuku ya kideri bandani.'
    }
  ];

  return NextResponse.json({ events: dynamicEvents });
}
