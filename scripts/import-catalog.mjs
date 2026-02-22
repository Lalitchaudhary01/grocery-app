import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalog = [
  { category: 'Anaaj & Atta', products: [
    ['Aashirvaad Atta 5kg','5 kg',245],['Chakki Fresh Atta 10kg','10 kg',460],['Maida','1 kg',52],['Suji','1 kg',44],['Besan','1 kg',92],['Multigrain Atta','5 kg',289],
  ]},
  { category: 'Chawal & Daal', products: [
    ['India Gate Basmati 5kg','5 kg',420],['Sona Masoori Rice','5 kg',345],['Arhar Dal','1 kg',155],['Chana Dal','1 kg',95],['Moong Dal','1 kg',132],['Masoor Dal','1 kg',118],
  ]},
  { category: 'Tel & Ghee', products: [
    ['Fortune Soya Oil 1L','1 litre',135],['Mustard Oil 1L','1 litre',165],['Sunflower Oil 1L','1 litre',149],['Desi Ghee 500g','500 g',330],['Vanaspati Ghee 1L','1 litre',178],
  ]},
  { category: 'Masale & Namak', products: [
    ['Tata Namak','1 kg',25],['Haldi Powder','200 g',42],['Mirch Powder','200 g',68],['Dhaniya Powder','200 g',55],['Garam Masala','100 g',64],['Jeera','100 g',58],
  ]},
  { category: 'Chai & Sugar', products: [
    ['Tata Tea Gold','500 g',285],['Red Label Tea','500 g',270],['Sugar','1 kg',46],['Brown Sugar','500 g',54],['Bru Coffee','100 g',165],
  ]},
  { category: 'Biscuit & Snacks', products: [
    ['Parle-G','800 g',48],['Good Day','200 g',38],['Marie Gold','250 g',42],['Bourbon','150 g',36],['Lays Classic','52 g',20],['Kurkure Masala Munch','90 g',20],
  ]},
  { category: 'Namkeen & Mixture', products: [
    ['Haldiram Mixture','200 g',62],['Aloo Bhujia','200 g',58],['Salted Peanuts','200 g',48],['Moong Dal Namkeen','200 g',52],
  ]},
  { category: 'Noodles & Ready To Cook', products: [
    ['Maggi 2-Minute Noodles','280 g',56],['Yippee Noodles','280 g',60],['Pasta','500 g',88],['Poha','1 kg',74],['Vermicelli','500 g',52],['Oats','1 kg',178],
  ]},
  { category: 'Dairy Products', products: [
    ['Milk Packet','500 ml',30],['Paneer','200 g',92],['Butter','500 g',265],['Cheese Slice','200 g',145],['Curd','400 g',42],['Lassi','200 ml',20],
  ]},
  { category: 'Safai Saaman', products: [
    ['Surf Excel','1 kg',245],['Rin Detergent Powder','1 kg',125],['Ariel Matic','1 kg',235],['Harpic Cleaner','500 ml',98],['Phenyl','1 litre',122],['Vim Bar','200 g',10],
  ]},
  { category: 'Personal Care', products: [
    ['Lux Soap','150 g',35],['Lifebuoy Soap','150 g',34],['Dove Soap','100 g',58],['Clinic Plus Shampoo','340 ml',182],['Colgate Toothpaste','200 g',112],['Hair Oil','300 ml',168],
  ]},
  { category: 'Daily Essentials', products: [
    ['Matchbox Pack','10 pcs',22],['Agarbatti','120 sticks',45],['Candle','6 pcs',36],['Battery AA','4 pcs',75],['Aluminium Foil','1 roll',85],['Plastic Bags Pack','30 pcs',55],
  ]},
  { category: 'Bakery Items', products: [
    ['Bread','400 g',45],['Brown Bread','400 g',52],['Bun','6 pcs',38],['Rusk','500 g',84],['Tea Cake','250 g',95],
  ]},
  { category: 'Plastic & Household', products: [
    ['Balti 15L','1 piece',220],['Mug','1 piece',48],['Water Bottle 1L','1 piece',95],['Storage Container Set','3 pcs',210],['Dustbin','1 piece',285],
  ]},
  { category: 'Seasonal Items', products: [
    ['Rakhi Set','1 pack',120],['Diya Pack','12 pcs',65],['Holi Color Pack','4 colors',98],['Festival Decoration Set','1 set',185],
  ]},
  { category: 'Dry Fruits', products: [
    ['Almonds','250 g',245],['Cashew','250 g',295],['Raisins','250 g',145],['Pistachio','200 g',325],['Dates','500 g',188],
  ]},
  { category: 'Puja Saaman', products: [
    ['Agarbatti Premium','100 sticks',58],['Dhoop','20 sticks',42],['Camphor','100 g',65],['Cotton Wicks','100 pcs',40],['Pooja Oil','500 ml',95],
  ]},
  { category: 'Baby Care', products: [
    ['Baby Powder','200 g',165],['Baby Soap','75 g',62],['Baby Shampoo','200 ml',198],['Diapers Small Pack','20 pcs',325],['Baby Lotion','200 ml',215],
  ]},
  { category: 'Frozen Items', products: [
    ['Ice Cream Family Pack','700 ml',185],['Frozen Peas','500 g',92],['Frozen Corn','500 g',98],['Frozen Nuggets','400 g',215],
  ]},
  { category: 'Pet Food', products: [
    ['Dog Food','1 kg',285],['Cat Food','1 kg',310],['Pet Biscuits','500 g',165],['Fish Food','100 g',95],
  ]},
];

function labelFromCategoryName(name) {
  const m = /^\[\[img:(.+?)\]\]\s*(.*)$/i.exec((name || '').trim());
  if (m) return (m[2] || '').trim();
  return (name || '').trim();
}

function encodeDescription(text, meta) {
  return `${text}\n\n[META]${JSON.stringify(meta)}`;
}

function slugify(v) {
  return v
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function main() {
  const existingCategories = await prisma.category.findMany({ select: { id: true, name: true } });
  const categoryByLabel = new Map(existingCategories.map((c) => [labelFromCategoryName(c.name).toLowerCase(), c]));

  let categoriesCreated = 0;
  let productsCreated = 0;
  let productsUpdated = 0;

  for (const entry of catalog) {
    const key = entry.category.toLowerCase();
    let category = categoryByLabel.get(key);

    if (!category) {
      category = await prisma.category.create({ data: { name: entry.category }, select: { id: true, name: true } });
      categoryByLabel.set(key, category);
      categoriesCreated += 1;
    }

    for (const [productName, unit, price] of entry.products) {
      const mrp = Math.ceil(price * 1.12);
      const stock = Math.max(8, Math.floor(Math.random() * 45) + 8);
      const discountPercent = Math.max(0, Math.round(((mrp - price) / mrp) * 100));
      const description = encodeDescription(
        `${productName} - gaon ke liye trusted daily-use grocery item.`,
        {
          mrp,
          unit,
          discountPercent,
          isActive: true,
          variantGroup: slugify(productName.split(' ')[0] || productName),
          variantRank: 0,
        },
      );

      const existing = await prisma.product.findFirst({
        where: { name: productName, categoryId: category.id },
        select: { id: true },
      });

      if (existing) {
        await prisma.product.update({
          where: { id: existing.id },
          data: {
            description,
            price,
            stock,
            imageUrl: null,
          },
        });
        productsUpdated += 1;
      } else {
        await prisma.product.create({
          data: {
            name: productName,
            description,
            price,
            stock,
            imageUrl: null,
            categoryId: category.id,
          },
        });
        productsCreated += 1;
      }
    }
  }

  console.log(JSON.stringify({ categoriesCreated, productsCreated, productsUpdated }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
