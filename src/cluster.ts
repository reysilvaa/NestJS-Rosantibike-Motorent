import * as cluster from 'node:cluster';
import { cpus } from 'node:os';
import { Logger } from '@nestjs/common';

// Type assertion untuk mengatasi masalah TypeScript dengan Node.js cluster API
interface ClusterManager {
  isMaster: boolean;
  fork: () => any;
  on: (event: string, callback: any) => void;
}

const clusterManager = cluster as unknown as ClusterManager;
const numCPUs = cpus().length;
const logger = new Logger('Cluster');

/**
 * Setup aplikasi dalam mode cluster
 * @param bootstrapFunction Fungsi bootstrap aplikasi
 */
export function setupCluster(bootstrapFunction: () => Promise<void>): void {
  if (clusterManager.isMaster) {
    logger.log(`Mode cluster diaktifkan - Master process ${process.pid} berjalan`);

    // Fork workers berdasarkan jumlah CPU
    for (let i = 0; i < numCPUs; i++) {
      clusterManager.fork();
    }

    clusterManager.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} mati dengan kode: ${code} dan sinyal: ${signal}`);
      logger.log('Membuat worker baru...');
      clusterManager.fork();
    });
  } else {
    // Worker process menjalankan aplikasi
    logger.log(`Worker ${process.pid} dimulai`);
    bootstrapFunction().catch(error => {
      logger.error(`Worker ${process.pid} gagal start: ${error.message}`, error.stack);
      process.exit(1);
    });
  }
}
