# 🚀 Quick Start Guide - HubConnect

## Installation & Setup (2 minutes)

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Start the App**

   ```bash
   npm run dev
   ```

3. **Open Browser**
   - Go to: http://localhost:3000
   - You should see the login page

## � Theme Toggle

The app supports light and dark modes:

- Click the **sun/moon icon** in the top-right corner (next to the user profile)
- Your preference is saved automatically
- Theme preference respects system settings if not explicitly set

## 🎯 Testing the Application

### 1. Login as Instructor

```
Email: instructor@hub.com
Password: inst123
```

**What you can do:**

- ✅ View Dashboard with statistics and quick actions
- ✅ Create new tasks (click "Create Task" button)
- ✅ View all tasks
- ✅ See Analytics page with charts
- ✅ View all teams
- ✅ Create and manage Workspaces
- ✅ Use General and Workspace chat channels
- ✅ Toggle light/dark theme

### 2. Login as Team Leader

```
Email: leader@hub.com
Password: lead123
```

**What you can do:**

- ✅ View Dashboard with team stats
- ✅ View assigned team tasks
- ✅ **Create tasks within assigned workspace** (new feature)
- ✅ Submit tasks
- ✅ Use **tabbed chat** (General/Workspace/Team channels)
- ✅ View team members
- ✅ Access Workspaces and manage team tasks
- ✅ Toggle theme (sun/moon button in navbar)

### 3. Login as Student

```
Email: student@hub.com
Password: stud123
```

**What you can do:**

- ✅ View Dashboard with assigned tasks
- ✅ View assigned tasks with deadlines
- ✅ Check submission status
- ✅ Use **tabbed chat** (General/Workspace/Team)
- ✅ View team members
- ✅ Access Workspaces (read-only)
- ✅ Switch to dark mode theme

### 4. Login as Admin

```
Email: admin@hub.com
Password: admin123
```

**What you can do:**

- ✅ Full access to all features
- ✅ Create and manage tasks
- ✅ View analytics
- ✅ Manage teams
- ✅ **Create and manage Workspaces**
- ✅ **Assign Team Leaders per workspace**
- ✅ View all chat channels
- ✅ System-wide admin settings in Profile

## 📋 Features to Test

### ✨ NEW: Workspace Management (Admin/Instructor)

1. Login as Instructor or Admin
2. Click **"Workspaces"** in the sidebar
3. Click **"+ Create Workspace"**
4. Fill details:
   - Workspace name: "Spring 2026 Project"
   - End date: Pick a future date
5. Click "Create"
6. Click on the workspace card to view details
7. In **Workspace Details** page:
   - Add teams from the Teams section
   - Assign a **Team Leader** (crown icon)
   - Create tasks for the workspace (Team Leader only)
   - Manage team members

### ✨ NEW: Team Leader Task Creation

1. Login as Team Leader
2. Go to the **Workspaces** page
3. Click on a workspace where you're a leader
4. In **"Team Tasks"** section, click **"+ Add Task"**
5. Fill in:
   - Title: "Implement feature X"
   - Description: "Details"
   - Priority: High/Medium/Low
6. Click "Add Task"
7. You can now update task status with the dropdown

### ✨ ENHANCED: Chat with Tabs

1. Open app in two browser tabs
2. Login as Team Leader in tab 1, Student in tab 2
3. Both go to **Chat** page
4. Notice three tabs: **General | Workspace | Team**
5. **General** - Platform-wide chat
6. **Workspace** - Available if assigned to a workspace
7. **Team** - Available if in a team
8. See **avatars and role labels** on messages

### Task Management (Existing)

1. Login as Instructor
2. Click "Create Task" in sidebar
3. Fill in task details:
   - Title: "Test Task"
   - Description: "This is a test task"
   - Deadline: Pick a future date
   - Assign to: Team or Individual
4. Click "Create Task"
5. See the task in Tasks page

### Submit a Task

1. Login as Team Leader
2. Go to Tasks page
3. Click on any pending task
4. Click "Submit Task" button
5. Add:
   - GitHub link (required)
   - Upload file (optional)
   - Add comment (optional)
6. Click "Submit Task"
7. See submission confirmation

### ✨ ENHANCED: User Profile & Preferences

1. Click on your avatar in the top-right corner
2. Click "Account Settings" or go to Profile page
3. See three tabs:
   - **Profile Information** - Edit name, email, phone, bio
   - **Change Password** - Update your password
   - **Preferences** - Appearance (Light/Dark theme toggle) + Admin-only settings
4. Theme changes apply immediately

### Real-Time Chat (Existing)

1. Open app in two browser tabs
2. Login as Team Leader in tab 1
3. Login as Student in tab 2
4. Both go to Chat page and choose the same team channel
5. Type a message in one tab - see it appear instantly in the other
6. Notice the avatar circles with initials for each sender

## 🌐 Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (responsive UI)

## 🐛 Troubleshooting

- **Port already in use**: Kill process on port 3000 or change `VITE_PORT`
- **CORS errors**: Server should be running (mock API used locally)
- **Chat not working**: Check Socket.io mock connection (check browser console)
- **Dark mode not persisting**: Clear localStorage and refresh

## 📊 Testing Checklist

- [ ] Login with all 4 demo accounts
- [ ] Toggle light/dark theme and verify it persists
- [ ] Test workspace creation (as Admin/Instructor)
- [ ] Test workspace details page (teams, members, tasks)
- [ ] Test Team Leader task creation in a workspace
- [ ] Test tabbed chat with different channels
- [ ] Test profile/settings page with all tabs
- [ ] View avatar in navbar, sidebar, and chat messages
- [ ] Test responsive design on mobile view
- [ ] Verify all pages have dark mode support

4. Go to Chat page in both tabs
5. Send messages - they appear in both tabs instantly!
6. See typing indicators when someone is typing

### Analytics Dashboard

1. Login as Instructor
2. Click "Analytics" in sidebar
3. View:
   - Submission statistics
   - Timeline bar chart
   - On-time vs Late pie chart
   - Team rankings
   - Detailed performance table

## 🎨 UI Elements to Explore

### Notifications

- Click the bell icon in the top right
- See unread count badge
- Click on notifications to mark as read
- Click "Mark all read" to clear all

### Sidebar Navigation

- Responsive - collapses on mobile
- Click hamburger menu on mobile
- Shows different options based on role
- Active page is highlighted

### Filters & Search

- Go to Tasks page
- Use search bar to filter tasks
- Use status dropdown to filter by status

## 🐛 Common Issues

**Port 3000 already in use?**

- Stop other apps using port 3000
- Or change port in `vite.config.js`

**Dependencies not installing?**

```bash
# Delete and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Page not loading?**

- Clear browser cache
- Check console for errors
- Ensure dev server is running

## 📊 Data Notes

- All data is **mock data** (no real backend)
- Data **resets** when you refresh the page
- Perfect for **testing and demo** purposes

## 🎓 Learning Path

1. **Start Simple**: Login and explore the dashboard
2. **Create Tasks**: Use instructor account to create tasks
3. **Submit Tasks**: Use team leader account to submit
4. **Check Analytics**: View performance data as instructor
5. **Try Chat**: Open multiple tabs to see real-time updates

## 💡 Tips

- Use demo credentials (click the buttons on login page)
- Try different roles to see permission differences
- Open DevTools (F12) to see console logs
- Check Network tab to see API calls
- Explore responsive design (resize browser)

## ✅ Checklist

- [ ] App runs successfully at localhost:3000
- [ ] Can login with all 4 demo accounts
- [ ] Can create a task as instructor
- [ ] Can submit a task as team leader
- [ ] Can see analytics charts
- [ ] Can send messages in chat
- [ ] Notifications appear and work
- [ ] Mobile responsive (test by resizing)

## 🚀 Next Steps

1. **Customize**: Modify colors in `tailwind.config.js`
2. **Add Features**: Extend functionality in components
3. **Connect Backend**: Replace mock API with real endpoints
4. **Deploy**: Run `npm run build` and deploy to Vercel/Netlify

---

**Need help?** Check the main README.md for detailed documentation.

**Enjoy exploring HubConnect! 🎉**
