import { PrismaClient, Role } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await hash("Cellshop@2026", 12);
  await prisma.user.upsert({
    where: { email: "admin@cellshop.com.br" },
    update: { passwordHash, active: true },
    create: {
      name: "Administrador",
      email: "admin@cellshop.com.br",
      passwordHash,
      role: Role.ADMIN,
    },
  });

  const variants = [
    { model: "iPhone 15 Pro", storage: "256 GB", color: "Titânio Natural" },
    { model: "iPhone 15", storage: "128 GB", color: "Preto" },
    { model: "iPhone 14", storage: "128 GB", color: "Azul" },
  ];
  for (const variant of variants) {
    await prisma.productVariant.upsert({
      where: { brand_model_storage_color: { brand: "Apple", ...variant } },
      update: {},
      create: variant,
    });
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
