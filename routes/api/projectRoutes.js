const router = require('express').Router();
const { Project } = require('../../models/projectSchema');
const { authMiddleware } = require('../../utils/auth');
 
// Apply authMiddleware to all routes in this file
router.use(authMiddleware);
 
// GET /api/projects - Get all projects for the logged-in user

router.get('/', async (req, res) => {
 
  try {
    const projects = await Project.find({ user: req.user._id });
    res.json(projects);
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'No project found with this id!' });
    }
    if (project.user.toString() !== req.user._id) {
      return res.status(403).json({ message: 'User is not authorized to view this project.' });
    }
    res.json(project);
  } catch (err) {
    res.status(500).json(err);
  }
});
 
// POST /api/projects - Create a new project
router.post('/', async (req, res) => {
  try {
    const project = await Project.create({
      ...req.body,
    
//  When a new project is created, you must associate it with the currently logged-in user. The authenticated user’s data should be available on req.user from the authentication middleware. Save the user’s _id to the new project’s user field.

    user: req.user._id

    });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json(err);
  }
});
 
// PUT /api/projects/:id - Update a project
router.put('/:id', async (req, res) => {
  try {
    // find the project by its ID
    const project = await Note.findById(req.params.id);  
    if (!project) {
      return res.status(404).json({ message: 'No note found with this id!' });
    }
    // Check if the user is authorized to update this note
    if (project.user.toString() !== req.user._id) {
      return res.status(403).json({ message: 'User is not authorized to update this note.' });
    }
    const updatedProject = await Note.findByIdAndUpdate(req.params.id, req.body, { returnDocument: 'after' });
    res.json(updatedProject);
  } catch (err) {
    res.status(500).json(err);
  }
});
 
// DELETE /api/projects/:id - Delete a project
// Secure “Delete Project”: Modify the DELETE /:id route. Similar to the update route, you must check for ownership before deleting a project.

// Find the project by its ID.
// If the user is the owner, delete the project.
// If the user is not the owner, return a 403 Forbidden status with an appropriate error message.

router.delete('/:id', async (req, res) => {
  try {
    // find the project by its ID
    const project = await Note.findById(req.params.id);

    // Check if the user is authorized to delete this project
    if (!project) {
      return res.status(404).json({ message: 'No project found with this id!' });
    }
    if (project.user.toString() !== req.user._id) {
      return res.status(403).json({ message: 'User is not authorized to delete this project.' });
    }
    await Note.findByIdAndDelete(req.params.id);
    res.json({ message: 'Project deleted!' });
  } catch (err) {
    res.status(500).json(err);
  }
});
 
module.exports = router;