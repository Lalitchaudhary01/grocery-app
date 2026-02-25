import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalog = [
  { category: 'Anaaj & Atta', products: [
    ['Aashirvaad Atta 5kg','5 kg',245],
    ['Chakki Fresh Atta 10kg','10 kg',460],
    ['Maida','1 kg',52],
    ['Suji','1 kg',44],
    ['Besan','1 kg',92],
    ['Multigrain Atta','5 kg',289],
  ]},

  { category: 'Chawal & Daal', products: [
    ['India Gate Basmati 5kg','5 kg',420],
    ['Sona Masoori Rice','5 kg',345],
    ['Arhar Dal','1 kg',155],
    ['Chana Dal','1 kg',95],
    ['Moong Dal','1 kg',132],
    ['Masoor Dal','1 kg',118],
  ]},

  { category: 'Tel & Ghee', products: [
    ['Fortune Soya Oil','1 litre',135],
    ['Mustard Oil','1 litre',165],
    ['Sunflower Oil','1 litre',149],
    ['Desi Ghee','500 g',330],
    ['Vanaspati Ghee','1 litre',178],
  ]},

  { category: 'Masale & Namak', products: [
    ['Tata Namak','1 kg',25],
    ['Haldi Powder','200 g',42],
    ['Mirch Powder','200 g',68],
    ['Dhaniya Powder','200 g',55],
    ['Garam Masala','100 g',64],
  ]},

  { category: 'Chini, Chai & Coffee', products: [
    ['Sugar','1 kg',46],
    ['Brown Sugar','500 g',54],
    ['Tata Tea','500 g',285],
    ['Red Label','500 g',270],
    ['Bru Coffee','100 g',165],
  ]},

  { category: 'Biscuit', products: [
    ['Parle-G','800 g',48],
    ['Good Day','200 g',38],
    ['Marie Gold','250 g',42],
    ['Bourbon','150 g',36],
    ['Tiger Biscuit','150 g',28],
  ]},

  { category: 'Namkeen', products: [
    ['Haldiram Mixture','200 g',62],
    ['Aloo Bhujia','200 g',58],
    ['Salted Peanuts','200 g',48],
    ['Moong Dal Namkeen','200 g',52],
  ]},

  { category: 'Chips & Wafers', products: [
    ['Lays Classic','52 g',20],
    ['Kurkure','90 g',20],
    ['Bingo','60 g',20],
    ['Uncle Chips','50 g',20],
  ]},

  { category: 'Noodles & Pasta', products: [
    ['Maggi','280 g',56],
    ['Yippee','280 g',60],
    ['Pasta','500 g',88],
    ['Vermicelli','500 g',52],
  ]},

  { category: 'Cold Drinks', products: [
    ['Coca Cola','750 ml',40],
    ['Pepsi','750 ml',40],
    ['Sprite','750 ml',40],
    ['Thums Up','750 ml',40],
  ]},

  { category: 'Packaged Water', products: [
    ['Bisleri','1 litre',20],
    ['Kinley','1 litre',20],
    ['Rail Neer','1 litre',15],
  ]},

  { category: 'Juice & Beverages', products: [
    ['Frooti','200 ml',10],
    ['Real Juice','1 litre',110],
    ['Tropicana','1 litre',115],
  ]},

  { category: 'Breakfast Items', products: [
    ['Cornflakes','500 g',165],
    ['Oats','1 kg',178],
    ['Chocos','375 g',185],
    ['Daliya','500 g',62],
  ]},

  { category: 'Sauces & Pickle', products: [
    ['Tomato Ketchup','500 g',95],
    ['Chilli Sauce','200 g',65],
    ['Soy Sauce','200 ml',78],
    ['Mango Pickle','500 g',125],
  ]},

  { category: 'Washing Powder', products: [
    ['Surf Excel','1 kg',245],
    ['Ariel','1 kg',235],
    ['Ghadi','1 kg',98],
    ['Wheel','1 kg',85],
  ]},

  { category: 'Bathroom Cleaner', products: [
    ['Harpic','500 ml',98],
    ['Lizol','500 ml',110],
    ['Domex','500 ml',95],
  ]},

  { category: 'Dishwash', products: [
    ['Vim Bar','200 g',10],
    ['Vim Liquid','500 ml',125],
    ['Pril','500 ml',118],
  ]},

  { category: 'Soap & Body Care', products: [
    ['Lux','150 g',35],
    ['Lifebuoy','150 g',34],
    ['Dove','100 g',58],
    ['Santoor','150 g',32],
  ]},

  { category: 'Shampoo & Hair Care', products: [
    ['Clinic Plus','340 ml',182],
    ['Head & Shoulders','340 ml',210],
    ['Hair Oil','300 ml',168],
  ]},

  { category: 'Oral Care', products: [
    ['Colgate','200 g',112],
    ['Pepsodent','150 g',95],
    ['Toothbrush','1 pc',35],
    ['Mouthwash','250 ml',125],
  ]},

  { category: 'Plastic Items', products: [
    ['Balti 15L','1 pc',220],
    ['Mug','1 pc',48],
    ['Water Bottle','1 pc',95],
  ]},

  { category: 'Kitchen Tools', products: [
    ['Gas Lighter','1 pc',85],
    ['Tea Strainer','1 pc',45],
    ['Steel Spoon','1 pc',35],
  ]},

  { category: 'Daily Use Items', products: [
    ['Matchbox','10 pcs',22],
    ['Candle','6 pcs',36],
    ['Battery AA','4 pcs',75],
  ]},

  { category: 'Dry Fruits', products: [
    ['Almond','250 g',245],
    ['Cashew','250 g',295],
    ['Raisins','250 g',145],
  ]},

  { category: 'Puja Saaman', products: [
    ['Dhoop','20 sticks',42],
    ['Camphor','100 g',65],
    ['Cotton Wicks','100 pcs',40],
  ]},

  { category: 'Baby Care', products: [
    ['Baby Powder','200 g',165],
    ['Baby Soap','75 g',62],
    ['Diapers','20 pcs',325],
  ]},

  { category: 'Energy Drinks', products: [
    ['Red Bull','250 ml',125],
    ['Sting','250 ml',20],
  ]},

  { category: 'Shaving & Grooming', products: [
    ['Shaving Cream','70 g',85],
    ['Razor','1 pc',45],
    ['After Shave','100 ml',165],
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
