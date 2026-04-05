import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateUserToAdmin() {
  try {
    const phone = '13227862250';

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { phone },
      select: { id: true, username: true, role: true },
    });

    if (!user) {
      console.log(`用户 ${phone} 不存在`);
      return;
    }

    console.log(`找到用户: ${user.username} (角色: ${user.role})`);

    // 更新用户角色为ADMIN
    const updatedUser = await prisma.user.update({
      where: { phone },
      data: { role: 'ADMIN' },
      select: { id: true, username: true, role: true, phone: true },
    });

    console.log('用户角色更新成功:');
    console.log(updatedUser);
  } catch (error) {
    console.error('更新失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// 执行更新
updateUserToAdmin();