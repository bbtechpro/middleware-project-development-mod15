const router = require('express').Router();
const { Task } = require('../../models/taskSchema');
const { Project } = require('../../models/projectSchema');
const { authMiddleware } = require('../../utils/auth');

async function verifyProjectOwnership(projectId, userId) {
  const project = await Project.findById(projectId);
  if (!project) {
    return null;
  }
  if (project.user.toString() !== userId) {
    return false;
  }
  return project;
}

// POST /api/projects/:projectId/tasks - Create a new task for a project
router.post('/projects/:projectId/tasks', authMiddleware, async (req, res) => {
  try {
    const project = await verifyProjectOwnership(req.params.projectId, req.user._id);

    if (project === null) {
      return res.status(404).json({ message: 'No project found with this id!' });
    }
    if (project === false) {
      return res.status(403).json({ message: 'User is not authorized to create tasks for this project.' });
    }

    const task = await Task.create({
      ...req.body,
      project: project._id,
    });

    res.status(201).json(task);
  } catch (err) {
    res.status(400).json(err);
  }
});

// GET /api/projects/:projectId/tasks - Get all tasks for a project
router.get('/projects/:projectId/tasks', authMiddleware, async (req, res) => {
  try {
    const project = await verifyProjectOwnership(req.params.projectId, req.user._id);

    if (project === null) {
      return res.status(404).json({ message: 'No project found with this id!' });
    }
    if (project === false) {
      return res.status(403).json({ message: 'User is not authorized to view tasks for this project.' });
    }

    const tasks = await Task.find({ project: project._id });
    res.json(tasks);
  } catch (err) {
    res.status(500).json(err);
  }
});

// PUT /api/tasks/:taskId - Update a task
router.put('/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'No task found with this id!' });
    }

    const project = await Project.findById(task.project);
    if (!project) {
      return res.status(404).json({ message: 'No project found for this task.' });
    }
    if (project.user.toString() !== req.user._id) {
      return res.status(403).json({ message: 'User is not authorized to update this task.' });
    }

    const updatedTask = await Task.findByIdAndUpdate(req.params.taskId, req.body, {
      new: true,
    });

    res.json(updatedTask);
  } catch (err) {
    res.status(500).json(err);
  }
});

// DELETE /api/tasks/:taskId - Delete a task
router.delete('/tasks/:taskId', authMiddleware, async (req, res) => {
  try {
    const task = await Task.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ message: 'No task found with this id!' });
    }

    const project = await Project.findById(task.project);
    if (!project) {
      return res.status(404).json({ message: 'No project found for this task.' });
    }
    if (project.user.toString() !== req.user._id) {
      return res.status(403).json({ message: 'User is not authorized to delete this task.' });
    }

    await Task.findByIdAndDelete(req.params.taskId);
    res.json({ message: 'Task deleted!' });
  } catch (err) {
    res.status(500).json(err);
  }
});

module.exports = router;
