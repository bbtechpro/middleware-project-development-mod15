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
    if (project.user.toString() !== req.user._id.toString()) {
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
    const { name, description } = req.body || {};

    if (!name || !description) {
      return res.status(400).json({ message: 'Please provide name and description.' });
    }

    const project = await Project.create({
      name,
      description,
      user: req.user._id,
    });

    return res.status(201).json(project);
  } catch (err) {
    return res.status(400).json({ message: 'Error creating project', error: err.message });
  }
});
 
// PUT /api/projects/:id - Update a project
router.put('/:id', async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'No project found with this id!' });
    }

    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User is not authorized to update this project.' });
    }

    const updates = {};
    if (req.body && req.body.name !== undefined) updates.name = req.body.name;
    if (req.body && req.body.description !== undefined) updates.description = req.body.description;

    const updatedProject = await Project.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    return res.json(updatedProject);
  } catch (err) {
    return res.status(500).json({ message: 'Error updating project', error: err.message });
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
    const project = await Project.findById(req.params.id);

    // Check if the user is authorized to delete this project
    if (!project) {
      return res.status(404).json({ message: 'No project found with this id!' });
    }
    if (project.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'User is not authorized to delete this project.' });
    }
    await Project.findByIdAndDelete(req.params.id);
    return res.json({ message: 'Project deleted!' });
  } catch (err) {
    return res.status(500).json({ message: 'Error deleting project', error: err.message });
  }
});
 
module.exports = router;