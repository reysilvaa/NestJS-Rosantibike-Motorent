import * as cluster from 'cluster';
import * as os from 'os';
import { Logger } from '@nestjs/common';

const logger = new Logger('Cluster');

export function setupCluster(bootstrap: () => Promise<void>): void {
  const numCPUs = os.cpus().length;
  
  if (cluster.isPrimary) {
    logger.log(`Master server started on ${process.pid}`);
    logger.log(`Setting up ${numCPUs} workers...`);

    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
      cluster.fork();
    }

    cluster.on('exit', (worker, code, signal) => {
      logger.warn(`Worker ${worker.process.pid} died. Restarting...`);
      cluster.fork();
    });
  } else {
    // Workers can share any TCP connection
    bootstrap().catch(err => {
      logger.error(`Worker failed to start: ${err.message}`, err.stack);
      process.exit(1);
    });
    
    logger.log(`Worker ${process.pid} started`);
  }
} 