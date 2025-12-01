import dataSource from '../../data-source.js';

async function revertMigration() {
  try {
    await dataSource.initialize();
    await dataSource.undoLastMigration();
    await dataSource.destroy();
    console.log('Migration reverted successfully');
    process.exit(0);
  } catch (error) {
    console.error('Migration revert failed:', error);
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

void revertMigration();
