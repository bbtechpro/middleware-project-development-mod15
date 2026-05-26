const { Schema, model } = require('mongoose');
 
const projectSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
    description: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
});
 
const Project = model('Project', projectSchema);

module.exports = { Project };