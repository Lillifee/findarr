import 'dotenv/config';
import type { CreateUser } from '@findarr/shared';
import { createUser, getUserByEmail } from '../services/user.js';
import { createDatabase } from './index.js';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@findarr.local';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'changeme';
const ADMIN_NAME = process.env.ADMIN_NAME || 'Admin';

async function seed() {
  try {
    console.log('🌱 Seeding database...');

    const db = createDatabase();

    // Check if admin already exists
    const existingAdmin = getUserByEmail(db, ADMIN_EMAIL);

    if (existingAdmin) {
      console.log('✨ Admin user already exists');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      db.close();
      return;
    }

    // Create admin user
    const userData: CreateUser = {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
      displayName: ADMIN_NAME,
      role: 'admin',
    };

    const admin = await createUser(db, userData);
    if (!admin) {
      throw new Error('Failed to create admin user');
    }

    console.log('✅ Admin user created successfully!');
    console.log(`   Email: ${admin.email}`);
    console.log(`   Password: ${ADMIN_PASSWORD}`);
    console.log(`   Role: ${admin.role}`);
    console.log('');
    console.log('⚠️  Please change the default password after first login!');

    db.close();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
