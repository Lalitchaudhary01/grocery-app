import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const catalog = [

  // 🟢 Anaaj & Atta
  {
    category: 'Anaaj & Atta',
    products: [
      ['Aashirvaad Atta 5kg','5 kg',245],
      ['Chakki Fresh Atta 10kg','10 kg',460],
      ['Maida','1 kg',52],
      ['Suji','1 kg',44],
      ['Besan','1 kg',92],
      ['Multigrain Atta','5 kg',289],
      ['Poha','1 kg',74],
    ]
  },

  // 🟢 Chawal & Daal
  {
    category: 'Chawal & Daal',
    products: [
      ['India Gate Basmati 5kg','5 kg',420],
      ['Sona Masoori Rice','5 kg',345],
      ['Arhar Dal','1 kg',155],
      ['Chana Dal','1 kg',95],
      ['Moong Dal','1 kg',132],
      ['Masoor Dal','1 kg',118],
    ]
  },

  // 🟢 Sarson & Refined Oil
  {
    category: 'Cooking Oil',
    products: [
      ['Pansaari Mustard Oil','1 litre',160],
      ['Pansaari Mustard Oil','2 litre',310],
      ['Tanaara Mustard Oil','1 litre',165],
      ['Til Oil','1 litre',210],
      ['Fortune Refined Oil','1 litre',135],
      ['Fortune Refined Oil','5 litre',650],
      ['Chambal Refined Oil','1 litre',130],
    ]
  },

  // 🟢 Ghee
  {
    category: 'Ghee',
    products: [
      ['Param Ghee','1 litre',520],
      ['Param Ghee','500 ml',260],
      ['Sunvaliya Ghee','1 litre',540],
      ['Sunvaliya Ghee','500 ml',275],
      ['Sunvaliya Ghee','200 g',120],
    ]
  },

  // 🟢 Washing Powder
  {
    category: 'Washing Powder',
    products: [
      ['Sargam Power','5 kg',420],
      ['Sargam Power','3 kg',260],
      ['Sargam Power','2 kg',180],
      ['Tide Power','5 kg',480],
      ['Tide Power Rose','1 kg',125],
      ['Selzer Ulta Shine','5 kg',410],
      ['Ghadi Power','5 kg',390],
      ['Surf Excel','1 kg',245],
      ['Fena Power','1 kg',95],
      ['Rin','1 kg',110],
    ]
  },

  // 🟢 Soap & Body Care
  {
    category: 'Soap & Body Care',
    products: [
      ['No.1 Soap','100 g',28],
      ['Lifebuoy','150 g',34],
      ['Lux','150 g',35],
      ['Dove','100 g',58],
      ['Pears','100 g',52],
    ]
  },

  // 🟢 Tea
  {
    category: 'Tea',
    products: [
      ['Taj Mahal Tea','100 g',60],
      ['Taj Mahal Tea','250 g',150],
      ['Taj Mahal Tea','500 g',285],
      ['Double Diamond Tea','250 g',120],
      ['Tata Gold','250 g',145],
      ['Tata Premium','250 g',135],
      ['Mohini Tea','250 g',95],
      ['Aag Tea','250 g',90],
    ]
  },

  // 🟢 Biscuit
  {
    category: 'Biscuit',
    products: [
      ['Parle-G','800 g',48],
      ['Twenty Biscuit','200 g',20],
      ['Coconut Biscuit','200 g',30],
      ['Bourbon','150 g',36],
      ['Butter Biscuit','200 g',40],
    ]
  },

  // 🟢 Namkeen
  {
    category: 'Namkeen',
    products: [
      ['Royal Mixture','400 g',85],
      ['Makhana Mixture','200 g',95],
      ['Palak Mixture','200 g',60],
      ['Heeng Papdi','200 g',55],
      ['Aloo Bhujia','200 g',58],
      ['Navratan Mixture','200 g',62],
      ['Teekha Meetha','200 g',60],
    ]
  },

  // 🟢 Sauce
  {
    category: 'Sauce',
    products: [
      ['Kisaan Ketchup','1 litre',110],
      ['Kisaan Pouch','50 pack',50],
      ['Mini Sauce Pack','10 pack',10],
    ]
  },

  // 🟢 Dry Fruits
  {
    category: 'Dry Fruits',
    products: [
      ['Almond','250 g',245],
      ['Cashew','250 g',295],
      ['Raisins','250 g',145],
      ['Anjeer','250 g',310],
      ['Walnut','250 g',350],
      ['Makhana','250 g',190],
    ]
  },

  // 🟢 Cold Drinks
  {
    category: 'Cold Drinks',
    products: [
      ['Coca Cola','750 ml',40],
      ['Pepsi','750 ml',40],
      ['Sprite','750 ml',40],
      ['Thums Up','750 ml',40],
      ['Sting','250 ml',20],
      ['Red Bull','250 ml',125],
    ]
  },

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
            mrp,
            unit,
            discount: null,
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
            mrp,
            unit,
            discount: null,
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
