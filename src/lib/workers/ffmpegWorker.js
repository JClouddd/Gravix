import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { logRouteError } from '@/lib/errorLogger';

/**
 * Basic FFmpeg worker to stitch multiple videos together.
 * @param {string[]} inputFiles - Array of absolute paths to video files to stitch.
 * @param {string} outputFile - Absolute path for the resulting output video.
 * @returns {Promise<string>} - Resolves with the outputFile path on success.
 */
export const stitchVideos = async (inputFiles, outputFile) => {
  return new Promise((resolve, reject) => {
    if (!inputFiles || inputFiles.length === 0) {
      return reject(new Error('No input files provided.'));
    }

    // Create a temporary text file listing the inputs for FFmpeg's concat demuxer
    const listFilePath = path.join('/tmp', `ffmpeg-concat-list-${Date.now()}.txt`);
    try {
      const listContent = inputFiles.map((file) => `file '${file}'`).join('\n');
      fs.writeFileSync(listFilePath, listContent);
    } catch (err) {
      logRouteError('FFmpegWorker', 'Failed to create concat list file', err, 'worker');
      return reject(err);
    }

    const args = [
      '-y', // Overwrite output files without asking
      '-f', 'concat',
      '-safe', '0',
      '-i', listFilePath,
      '-c', 'copy', // Stream copy for speed, assuming inputs have same encoding
      outputFile
    ];

    const ffmpegProcess = spawn('ffmpeg', args);

    ffmpegProcess.stderr.on('data', (data) => {
      // FFmpeg logs to stderr even for non-errors, can be used for progress tracking
      console.log(`FFmpeg Log: ${data.toString()}`);
    });

    ffmpegProcess.on('error', (err) => {
      logRouteError('FFmpegWorker', 'FFmpeg process spawn failed', err, 'worker');
      reject(err);
    });

    ffmpegProcess.on('close', (code) => {
      try {
        // Cleanup the temporary list file
        if (fs.existsSync(listFilePath)) {
          fs.unlinkSync(listFilePath);
        }
      } catch (cleanupErr) {
        console.warn('Failed to cleanup temp list file:', cleanupErr);
      }

      if (code === 0) {
        resolve(outputFile);
      } else {
        const error = new Error(`FFmpeg process exited with code ${code}`);
        logRouteError('FFmpegWorker', 'FFmpeg process failed', error, 'worker');
        reject(error);
      }
    });
  });
};
