const mongoose = require('mongoose');

/**
 * One document per user (unique index on `user`).
 * We store only the analysis + a hash of the CV text, never the file itself,
 * so database usage stays tiny. Uploading a different CV overwrites this document.
 */
const resumeSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    fileName: { type: String, required: true },
    fileSize: { type: Number },
    textHash: { type: String, required: true },
    analysis: { type: mongoose.Schema.Types.Mixed, required: true },
    aiProvider: String,
    aiModel: String,
    // version is created by $inc on first insert; analyzedAt is always set by the controller.
    // (No schema defaults here: they would conflict with the upsert update below.)
    version: { type: Number },
    analyzedAt: { type: Date },
    // Company practice sets (max 5). They belong to this CV, so they are cleared when the CV is replaced.
    companyPreps: { type: [mongoose.Schema.Types.Mixed], default: [] },
  },
  { timestamps: true }
);

resumeSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id.toString(),
    fileName: this.fileName,
    fileSize: this.fileSize,
    analysis: this.analysis,
    aiModel: this.aiModel,
    version: this.version,
    analyzedAt: this.analyzedAt,
  };
};

module.exports = mongoose.model('Resume', resumeSchema);
