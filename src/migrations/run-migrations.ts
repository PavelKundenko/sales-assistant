import dataSource from '../../data-source.js';

async function runMigrations() {
  try {
    await dataSource.initialize();
    await dataSource.runMigrations();
    await dataSource.destroy();
    console.log('Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    if (dataSource.isInitialized) {
      try {
        await dataSource.destroy();
      } catch (destroyError) {
        if (destroyError instanceof Error && !destroyError.message.includes('pool more than once')) {
          console.error('Error destroying data source:', destroyError);
        }
      }
    }
    process.exit(1);
  }
}

void runMigrations();
