import { Request, Response } from 'express';
import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary';
import { prisma } from '../utils/db';

export const uploadAssets = async (req: Request, res: Response) => {
  try {
    const { projectId } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    if (!req.files?.length) return res.status(400).json({ error: 'No files provided' });

    const files = req.files as Express.Multer.File[];
    const assets = [];

    for (const file of files) {
      const result = await uploadToCloudinary(file, `real_estate/${projectId}`);
      
      const asset = await prisma.asset.create({
        data: {
          publicId: result.public_id,
          url: result.secure_url,
          assetType: result.resource_type === 'image' ? 'IMAGE' : 
                    result.resource_type === 'video' ? 'VIDEO' : 'DOCUMENT',
          format: result.format,
        //   bytes: result.bytes,
        //   width: result.width,
        //   height: result.height,
          bytes: result.bytes.toString(),
          width: result.width?.toString() || '0',
          height: result.height?.toString() || '0',
          projectId,
          uploadedById: userId
        }
      });

      assets.push(asset);
    }

    res.status(201).json(assets);
  } catch (error) {
    res.status(500).json({ error: 'File upload failed' });
  }
};

export const deleteAsset = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: { project: true }
    });

    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    if (asset.uploadedById !== userId) return res.status(403).json({ error: 'Unauthorized' });

    await deleteFromCloudinary(asset.publicId);
    await prisma.asset.delete({ where: { id } });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: 'Delete failed' });
  }
};