import { useEffect, useState } from 'react'
import './App.css'
import { apiRequest } from './api'
import ResetPassword from './ResetPassword.jsx'

const events = [
  { name: 'Campus Tech Fest', day: '25', month: 'Oct', time: '10:00 AM', place: 'Main Auditorium' },
  { name: 'Student Meetup', day: '28', month: 'Oct', time: '2:00 PM', place: 'College Campus' },
]

const trends = [
  ['#CampusLife', 'Popular'],
  ['#MyCampus', 'Trending'],
  ['#StudentCommunity', 'Popular'],
]

function Avatar({ initials = 'CM', color = 'purple' }) {
  return <div className={`avatar ${color}`}>{initials}</div>
}

function CampusLoopApp() {
  const [posts, setPosts] = useState([])
  const [liked, setLiked] = useState([])
  const [search, setSearch] = useState('')
  const [message, setMessage] = useState('')
  const [commentText, setCommentText] = useState('')
  const [commenting, setCommenting] = useState(null)
  const [notice, setNotice] = useState('')
  const [authMode, setAuthMode] = useState('login')
  const [authName, setAuthName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPassword, setAuthPassword] = useState('')
  const [isLoggedIn, setIsLoggedIn] = useState(
    Boolean(localStorage.getItem('campusloop_token'))
  )
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeNav, setActiveNav] = useState('Feed')
  const [notifications, setNotifications] = useState([])
  const [notificationsLoading, setNotificationsLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [searchedUsers, setSearchedUsers] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [followingIds, setFollowingIds] = useState([])
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [profileLoading, setProfileLoading] = useState(false)
  const [profileName, setProfileName] = useState('')
  const [profileEmail, setProfileEmail] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [followBusyId, setFollowBusyId] = useState(null)
  // Marketplace state
const [items, setItems] = useState([])
const [itemLoading, setItemLoading] = useState(false)
const [itemName, setItemName] = useState('')
const [itemDescription, setItemDescription] = useState('')
const [itemCategory, setItemCategory] = useState('Books')
const [listingType, setListingType] = useState('Give Away')
const [rentalPrice, setRentalPrice] = useState('')
const [exchangePreference, setExchangePreference] = useState('')
const [itemSearch, setItemSearch] = useState('')
const [itemCategoryFilter, setItemCategoryFilter] = useState('All')
const [itemTypeFilter, setItemTypeFilter] = useState('All')
const [itemRequests, setItemRequests] = useState([])
const [myListings, setMyListings] = useState([])
  const [editingItemId, setEditingItemId] = useState(null)
  const [editItemName, setEditItemName] = useState('')
  const [editItemDescription, setEditItemDescription] = useState('')
  const [editItemCategory, setEditItemCategory] = useState('Books')
  const [editListingType, setEditListingType] = useState('Give Away')
  const [editRentalPrice, setEditRentalPrice] = useState('')
  const [editExchangePreference, setEditExchangePreference] = useState('')
const [myRequests, setMyRequests] = useState([])
const [receivedRequests, setReceivedRequests] = useState([])

  useEffect(() => {
  if (localStorage.getItem('campusloop_token')) {
    loadCurrentUser()
    loadPosts()
    loadNotifications()
    loadItems()
  }
}, [])

  async function loadCurrentUser() {
    try {
      const data = await apiRequest('/auth/profile')
      setCurrentUser(data.user || null)

      if (data.user?._id || data.user?.id) {
        await loadFollowing(data.user._id || data.user.id)
      }
    } catch (error) {
      setNotice(error.message || 'Could not load your profile. Please log in again.')
    }
  }

  async function loadFollowing(userId) {
    if (!userId) return

    try {
      const data = await apiRequest(`/follows/following/${userId}`)
      const ids = (data.following || [])
        .map((item) => item.following?._id || item.following)
        .filter(Boolean)
        .map(String)

      setFollowingIds(ids)
    } catch (error) {
      console.error('Could not load following list:', error.message)
    }
  }

  async function viewStudentProfile(studentId) {
    setProfileLoading(true)
    setSelectedProfile(null)

    try {
      const data = await apiRequest(`/auth/user/${studentId}`)
      setSelectedProfile(data.user || null)
    } catch (error) {
      setNotice(error.message || 'Could not load student profile.')
    } finally {
      setProfileLoading(false)
    }
  }

  async function toggleFollow(studentId) {
    if (!studentId || followBusyId) return

    const alreadyFollowing = followingIds.includes(String(studentId))
    setFollowBusyId(String(studentId))
    setNotice('')

    try {
      if (alreadyFollowing) {
        await apiRequest(`/follows/${studentId}`, {
          method: 'DELETE',
        })

        setFollowingIds((previous) =>
          previous.filter((id) => id !== String(studentId))
        )
        setNotice('You unfollowed this student.')
      } else {
        await apiRequest(`/follows/${studentId}`, {
          method: 'POST',
          body: JSON.stringify({}),
        })

        setFollowingIds((previous) => [...previous, String(studentId)])
        setNotice('You are now following this student.')
      }
    } catch (error) {
      setNotice(error.message || 'Could not update follow status.')
    } finally {
      setFollowBusyId(null)
    }
  }

  async function loadPosts() {
    try {
      const data = await apiRequest('/posts')
      const serverPosts = Array.isArray(data) ? data : data.posts || []

      const loadedPosts = await Promise.all(
        serverPosts.map(async (post) => {
          let comments = []
          let likes = []
          let userHasLiked = false

          try {
            const commentData = await apiRequest(`/comments/${post._id}`)
            comments = (commentData.comments || []).map((comment) => ({
              id: comment._id,
              user: comment.user?.name || 'CampusLoop Member',
              text: comment.text || '',
            }))
          } catch (error) {
            console.error('Could not load comments:', error.message)
          }

          try {
            const likeData = await apiRequest(`/likes/${post._id}`)
            likes = likeData.likes || []
            userHasLiked = likes.some(
              (like) =>
                like.user?._id === currentUser?.id ||
                like.user?._id === currentUser?._id
            )
          } catch (error) {
            console.error('Could not load likes:', error.message)
          }

          const name = post.user?.name || 'CampusLoop Member'

          return {
            id: post._id,
            name,
            initials: name
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase(),
            course: 'CampusLoop Member',
            time: post.createdAt
              ? new Date(post.createdAt).toLocaleDateString()
              : 'Recently',
            text: post.content || '',
            tag: '#MyCampus',
            likes: likes.length,
            comments,
            color: 'purple',
            userHasLiked,
          }
        })
      )

      setPosts(loadedPosts)
      setLiked(
        loadedPosts.filter((post) => post.userHasLiked).map((post) => post.id)
      )
    } catch (error) {
      setNotice(error.message || 'Could not load posts.')
    }
  }

  async function loadNotifications() {
    setNotificationsLoading(true)

    try {
      const data = await apiRequest('/notifications')
      setNotifications(data.notifications || [])
    } catch (error) {
      setNotice(error.message || 'Could not load notifications.')
    } finally {
      setNotificationsLoading(false)
    }
  }
  // Load marketplace items
async function loadItems() {
  setItemLoading(true)

  try {
    const data = await apiRequest('/items')
    setItems(data.items || [])
  } catch (error) {
    setNotice(error.message || 'Could not load marketplace items.')
  } finally {
    setItemLoading(false)
  }
}
async function loadMyListings() {
  setItemLoading(true)

  try {
    const data = await apiRequest('/items/my-listings')
    setMyListings(data.items || [])
  } catch (error) {
    setNotice(error.message || 'Could not load your listings.')
  } finally {
    setItemLoading(false)
  }
}
async function loadMyRequests() {
  setItemLoading(true)

  try {
    const data = await apiRequest('/item-requests/sent')
    setMyRequests(data.requests || [])
  } catch (error) {
    setNotice(error.message || 'Could not load your requests.')
  } finally {
    setItemLoading(false)
  }
}
async function loadReceivedRequests() {
  setItemLoading(true)

  try {
    const data = await apiRequest('/item-requests/received')
    setReceivedRequests(data.requests || [])
  } catch (error) {
    setNotice(error.message || 'Could not load received requests.')
  } finally {
    setItemLoading(false)
  }
}
// Send a request for a marketplace item
async function createItemRequest(itemId) {
  try {
    await apiRequest(`/item-requests/${itemId}`, {
      method: 'POST',
      body: JSON.stringify({
        message: 'I am interested in this item.',
      }),
    })

    setNotice('Your item request has been sent!')
  } catch (error) {
    setNotice(error.message || 'Could not send item request.')
  }
}
async function updateItemRequestStatus(requestId, status) {
  setItemLoading(true)
  setNotice('')

  try {
    const data = await apiRequest(`/item-requests/${requestId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })

    setNotice(data.message || `Request ${status.toLowerCase()} successfully.`)

    await loadReceivedRequests()
    await loadItems()
  } catch (error) {
    setNotice(error.message || 'Could not update request status.')
  } finally {
    setItemLoading(false)
  }
}
// Create a marketplace item
async function createItem(event) {
  event.preventDefault()

  if (!itemName.trim() || !itemDescription.trim()) {
    setNotice('Please enter the item name and description.')
    return
  }

  if (listingType === 'Rent' && Number(rentalPrice) <= 0) {
    setNotice('Please enter a valid rental price.')
    return
  }

  if (listingType === 'Exchange' && !exchangePreference.trim()) {
    setNotice('Please enter what you want in exchange.')
    return
  }

  setItemLoading(true)
  setNotice('')

  try {
    await apiRequest('/items', {
      method: 'POST',
      body: JSON.stringify({
        itemName: itemName.trim(),
        description: itemDescription.trim(),
        category: itemCategory,
        listingType,
        rentalPrice:
          listingType === 'Rent' ? Number(rentalPrice) : 0,
        exchangePreference:
          listingType === 'Exchange' ? exchangePreference.trim() : '',
      }),
    })

    setItemName('')
    setItemDescription('')
    setItemCategory('Books')
    setListingType('Give Away')
    setRentalPrice('')
    setExchangePreference('')

    setNotice('Your item has been listed successfully!')
    await loadItems()
  } catch (error) {
    setNotice(error.message || 'Could not create item listing.')
  } finally {
    setItemLoading(false)
  }
}


  function startEditingItem(item) {
    setEditingItemId(item._id)
    setEditItemName(item.itemName || '')
    setEditItemDescription(item.description || '')
    setEditItemCategory(item.category || 'Books')
    setEditListingType(item.listingType || 'Give Away')
    setEditRentalPrice(item.rentalPrice ? String(item.rentalPrice) : '')
    setEditExchangePreference(item.exchangePreference || '')
    setNotice('')
  }

  function cancelEditingItem() {
    setEditingItemId(null)
    setEditItemName('')
    setEditItemDescription('')
    setEditItemCategory('Books')
    setEditListingType('Give Away')
    setEditRentalPrice('')
    setEditExchangePreference('')
  }

  async function saveEditedItem(event, itemId) {
    event.preventDefault()
    if (!editItemName.trim() || !editItemDescription.trim()) {
      setNotice('Please enter the item name and description.')
      return
    }
    if (editListingType === 'Rent' && Number(editRentalPrice) <= 0) {
      setNotice('Please enter a valid rental price.')
      return
    }
    if (editListingType === 'Exchange' && !editExchangePreference.trim()) {
      setNotice('Please enter what you want in exchange.')
      return
    }

    setItemLoading(true)
    setNotice('')
    try {
      const data = await apiRequest(`/items/${itemId}`, {
        method: 'PUT',
        body: JSON.stringify({
          itemName: editItemName.trim(),
          description: editItemDescription.trim(),
          category: editItemCategory,
          listingType: editListingType,
          rentalPrice: editListingType === 'Rent' ? Number(editRentalPrice) : 0,
          exchangePreference: editListingType === 'Exchange' ? editExchangePreference.trim() : '',
        }),
      })
      setNotice(data.message || 'Your listing has been updated successfully!')
      cancelEditingItem()
      await Promise.all([loadMyListings(), loadItems()])
    } catch (error) {
      setNotice(error.message || 'Could not update your listing.')
    } finally {
      setItemLoading(false)
    }
  }

  async function deleteItem(itemId) {
    const confirmed = window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')
    if (!confirmed) return

    setItemLoading(true)
    setNotice('')
    try {
      const data = await apiRequest(`/items/${itemId}`, { method: 'DELETE' })
      if (editingItemId === itemId) cancelEditingItem()
      setNotice(data.message || 'Your listing has been deleted.')
      await Promise.all([loadMyListings(), loadItems()])
    } catch (error) {
      setNotice(error.message || 'Could not delete your listing.')
    } finally {
      setItemLoading(false)
    }
  }

  async function searchUsers(event) {
    event.preventDefault()
    const queryText = userSearch.trim()

    if (!queryText) {
      setSearchedUsers([])
      setNotice('Please enter a student name or email.')
      return
    }

    setUsersLoading(true)
    setNotice('')
    setSearchedUsers([])

    try {
      const query = encodeURIComponent(queryText)
      const data = await apiRequest(`/auth/search?q=${query}`)
      setSearchedUsers(data.users || [])

      if (!data.users || data.users.length === 0) {
        setNotice('No students found. Try another name or email.')
      }
    } catch (error) {
      setNotice(error.message || 'Could not search students.')
    } finally {
      setUsersLoading(false)
    }
  }

  async function markNotificationRead(id) {
    try {
      await apiRequest(`/notifications/${id}/read`, {
        method: 'PUT',
      })

      setNotifications((previous) =>
        previous.map((item) =>
          item._id === id ? { ...item, isRead: true } : item
        )
      )
    } catch (error) {
      setNotice(error.message || 'Could not mark notification as read.')
    }
  }
    async function deleteNotification(id) {
    try {
      await apiRequest(`/notifications/${id}`, {
        method: 'DELETE',
      })

      setNotifications((previous) =>
        previous.filter((item) => item._id !== id)
      )

      setNotice('Notification deleted.')
    } catch (error) {
      setNotice(error.message || 'Could not delete notification.')
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault()
    setLoading(true)
    setNotice('')

    try {
      const data = await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({
          email: authEmail.trim(),
        }),
      })

      setNotice(
        data.message ||
          'If an account exists for this email, a reset link will be sent.'
      )
    } catch (error) {
      setNotice(error.message || 'Could not request a password reset.')
    } finally {
      setLoading(false)
    }
  }

  async function handleAuth(event) {
    event.preventDefault()
    setLoading(true)
    setNotice('')

    try {
      const endpoint =
        authMode === 'register' ? '/auth/register' : '/auth/login'

      const body =
        authMode === 'register'
          ? {
              name: authName.trim(),
              email: authEmail.trim(),
              password: authPassword,
            }
          : {
              email: authEmail.trim(),
              password: authPassword,
            }

      const data = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(body),
      })

      if (authMode === 'register') {
        setNotice('Registration successful! Please log in.')
        setAuthMode('login')
        setAuthPassword('')
        return
      }

      if (!data.token) {
        throw new Error('Login response did not contain a token.')
      }

      localStorage.setItem('campusloop_token', data.token)
      setCurrentUser(data.user || { name: authEmail.trim() })

      if (data.user?.id) {
        await loadFollowing(data.user.id)
      }

      setIsLoggedIn(true)
      setAuthPassword('')
      setNotice('Welcome to CampusLoop!')

            await loadPosts()
      await loadNotifications()
      await loadItems()
    } catch (error) {
      setNotice(error.message || 'Authentication failed.')
    } finally {
      setLoading(false)
    }
  }
  async function saveProfile(event) {
  event.preventDefault()

  if (!profileName.trim() || !profileEmail.trim()) {
    setNotice('Please enter both your name and email.')
    return
  }

  setProfileSaving(true)
  setNotice('')

  try {
    const data = await apiRequest('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({
        name: profileName.trim(),
        email: profileEmail.trim(),
      }),
    })

    setCurrentUser(data.user)
    setProfileName(data.user.name || '')
    setProfileEmail(data.user.email || '')
    setNotice(data.message || 'Profile updated successfully!')
  } catch (error) {
    setNotice(error.message || 'Could not update your profile.')
  } finally {
    setProfileSaving(false)
  }
}

  function logout() {
    localStorage.removeItem('campusloop_token')
    setIsLoggedIn(false)
    setCurrentUser(null)
    setPosts([])
    setLiked([])
    setNotifications([])
    setFollowingIds([])
    setSelectedProfile(null)
    setActiveNav('Feed')
    setAuthMode('login')
    setNotice('You have logged out.')
  }

  async function publishPost(event) {
    event.preventDefault()

    if (!message.trim()) {
      setNotice('Please write something before posting.')
      return
    }

    setLoading(true)
    setNotice('')

    try {
      await apiRequest('/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: 'CampusLoop Post',
          content: message.trim(),
        }),
      })

      setMessage('')
      setNotice('Your post was saved successfully!')
      await loadPosts()
    } catch (error) {
      setNotice(error.message || 'Could not save post.')
    } finally {
      setLoading(false)
    }
  }

  async function toggleLike(id) {
    if (loading) return

    const alreadyLiked = liked.includes(id)
    setLoading(true)
    setNotice('')

    try {
      if (alreadyLiked) {
        await apiRequest(`/likes/${id}`, { method: 'DELETE' })
      } else {
        await apiRequest(`/likes/${id}`, {
          method: 'POST',
          body: JSON.stringify({}),
        })
      }

      setLiked((previous) =>
        alreadyLiked
          ? previous.filter((item) => item !== id)
          : [...previous, id]
      )

      setPosts((previous) =>
        previous.map((post) =>
          post.id === id
            ? {
                ...post,
                likes: Math.max(
                  0,
                  post.likes + (alreadyLiked ? -1 : 1)
                ),
              }
            : post
        )
      )

      setNotice(alreadyLiked ? 'Post unliked.' : 'Post liked!')
    } catch (error) {
      setNotice(error.message || 'Could not update like.')
    } finally {
      setLoading(false)
    }
  }

  async function addComment(id) {
    if (!commentText.trim()) return

    setLoading(true)
    setNotice('')

    try {
      await apiRequest(`/comments/${id}`, {
        method: 'POST',
        body: JSON.stringify({ text: commentText.trim() }),
      })

      setCommentText('')
      setCommenting(null)

      const data = await apiRequest(`/comments/${id}`)
      const comments = (data.comments || []).map((comment) => ({
        id: comment._id,
        user: comment.user?.name || 'CampusLoop Member',
        text: comment.text || '',
      }))

      setPosts((previous) =>
        previous.map((post) =>
          post.id === id ? { ...post, comments } : post
        )
      )

      setNotice('Comment saved successfully!')
    } catch (error) {
      setNotice(error.message || 'Could not save comment.')
    } finally {
      setLoading(false)
    }
  }

  const visiblePosts = posts.filter((post) => {
    const query = search.toLowerCase()

    return (
      post.text.toLowerCase().includes(query) ||
      post.name.toLowerCase().includes(query) ||
      post.tag.toLowerCase().includes(query)
    )
  })
  const visibleItems = items.filter((item) => {
  const query = itemSearch.trim().toLowerCase()

  const matchesSearch =
    `${item.itemName || ''} ${item.description || ''} ${item.category || ''}`
      .toLowerCase()
      .includes(query)

  const matchesCategory =
    itemCategoryFilter === 'All' ||
    item.category === itemCategoryFilter

  const matchesType =
    itemTypeFilter === 'All' ||
    item.listingType === itemTypeFilter

  return matchesSearch && matchesCategory && matchesType
})

  const unreadCount = notifications.filter(
    (notification) => !notification.isRead
  ).length

  if (!isLoggedIn) {
    return (
      <div className="auth-page">
        <form
          className="auth-card"
          onSubmit={
            authMode === 'forgot' ? handleForgotPassword : handleAuth
          }
        >
          <h1>CampusLoop</h1>
          <p>Connect with your campus community.</p>

          <h2>
            {authMode === 'register'
              ? 'Create Account'
              : authMode === 'forgot'
                ? 'Forgot Password'
                : 'Welcome Back'}
          </h2>

          {authMode === 'register' && (
            <input
              type="text"
              placeholder="Full name"
              value={authName}
              onChange={(event) => setAuthName(event.target.value)}
              required
            />
          )}

          <input
            type="email"
            placeholder="Email address"
            value={authEmail}
            onChange={(event) => setAuthEmail(event.target.value)}
            required
          />

          {authMode !== 'forgot' && (
            <input
              type="password"
              placeholder="Password"
              value={authPassword}
              onChange={(event) => setAuthPassword(event.target.value)}
              required
            />
          )}

          {authMode === 'login' && (
            <p>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('forgot')
                  setNotice('')
                }}
              >
                Forgot Password?
              </button>
            </p>
          )}

          <button type="submit" disabled={loading}>
            {loading
              ? 'Please wait...'
              : authMode === 'register'
                ? 'Register'
                : authMode === 'forgot'
                  ? 'Send Reset Link'
                  : 'Login'}
          </button>

          <p>
            {authMode === 'register'
              ? 'Already have an account? '
              : "Don't have an account? "}

            <button
              type="button"
              onClick={() => {
                setAuthMode(authMode === 'register' ? 'login' : 'register')
                setNotice('')
              }}
            >
              {authMode === 'register' ? 'Login' : 'Register'}
            </button>
          </p>

          {notice && <p role="alert">{notice}</p>}
        </form>
      </div>
    )
  }
    return (
    <div className="app">
      <header className="topbar">
        <h1>CampusLoop</h1>

        <input
          type="search"
          placeholder="Search posts..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        <div>
          <span>{currentUser?.name || 'CampusLoop Member'}</span>{' '}
          <button
            type="button"
            onClick={() => {
              setActiveNav('Notifications')
              loadNotifications()
            }}
          >
            🔔 Notifications {unreadCount > 0 && `(${unreadCount})`}
          </button>{' '}
          <button type="button" onClick={logout}>
            Logout
          </button>
        </div>
      </header>

      {notice && (
        <div className="notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice('')}>
            ×
          </button>
        </div>
      )}

      <div className="dashboard">
        <aside className="sidebar">
          <h3>Menu</h3>

          {[
  'My Profile',
  'Marketplace',
  'Add Item',
  'My Listings',
  'My Requests',
  'Requests Received',
  'Feed',
  'Events',
  'Trending',
  'Notifications',
  'Find Students',
].map((item) => (
            <button
              key={item}
              type="button"
              className={activeNav === item ? 'active' : ''}
              onClick={() => {
  setActiveNav(item)

if (item === 'My Profile') {
  setProfileName(currentUser?.name || '')
  setProfileEmail(currentUser?.email || '')
}

if (item === 'Notifications') loadNotifications()
  if (item === 'My Listings') loadMyListings()
  if (item === 'My Requests') loadMyRequests()
    if (item === 'Requests Received') loadReceivedRequests()
}}
            
            >
              {item}
              {item === 'Notifications' && unreadCount > 0
                ? ` (${unreadCount})`
                : ''}
            </button>
          ))}
        </aside>

        <main className="feed">
         {activeNav === 'Marketplace' && (
  <section>
    <h2>Campus Marketplace</h2>
    <p>Find items shared by other students.</p>

    <input
      type="search"
      placeholder="Search items..."
      value={itemSearch}
      onChange={(event) => setItemSearch(event.target.value)}
    />

    <select
      value={itemCategoryFilter}
      onChange={(event) => setItemCategoryFilter(event.target.value)}
    >
      <option value="All">All Categories</option>
      <option value="Books">Books</option>
      <option value="Electronics">Electronics</option>
      <option value="Clothing">Clothing</option>
      <option value="Accessories">Accessories</option>
      <option value="Other">Other</option>
    </select>
    <select
  value={itemTypeFilter}
  onChange={(event) => setItemTypeFilter(event.target.value)}
>
  <option value="All">All Listing Types</option>
  <option value="Give Away">Give Away</option>
  <option value="Rent">Rent</option>
  <option value="Exchange">Exchange</option>
</select>

    <button
      type="button"
      onClick={loadItems}
      disabled={itemLoading}
    >
      {itemLoading ? 'Loading...' : 'Refresh Items'}
    </button>

    {itemLoading && <p>Loading marketplace items...</p>}

   {!itemLoading && (
  <>
    {visibleItems.map((item) => (
      <article className="post-card" key={item._id}>
        <h3>{item.itemName}</h3>
        <p>{item.description}</p>
        <p><strong>Category:</strong> {item.category}</p>
        <p><strong>Type:</strong> {item.listingType}</p>

        {item.listingType === 'Rent' && (
          <p>
            <strong>Rental Price:</strong> ₹{item.rentalPrice}
          </p>
        )}

        {item.listingType === 'Exchange' && (
          <p>
            <strong>Exchange Preference:</strong> {item.exchangePreference}
          </p>
        )}

        <p>
          <strong>Posted by:</strong>{' '}
          {item.owner?.name || 'CampusLoop Student'}
        </p>

        {String(item.owner?._id) !==
          String(currentUser?._id || currentUser?.id) && (
          <button
            type="button"
            onClick={() => createItemRequest(item._id)}
          >
            Request Item
          </button>
        )}
      </article>
    ))}

         {visibleItems.length === 0 && (
      <p>No marketplace items found. Try changing your filters.</p>
    )}
  </>
)}
  </section>
)}

{activeNav === 'My Listings' && (
  <section>
    <h2>My Listings</h2>
    <p>Items you have posted in CampusLoop.</p>

    <button
      type="button"
      onClick={loadMyListings}
      disabled={itemLoading}
    >
      {itemLoading ? 'Loading...' : 'Refresh My Listings'}
    </button>

    {itemLoading && <p>Loading your listings...</p>}

    {!itemLoading && myListings.length === 0 && (
      <article className="post-card">
        <p>You have not posted any items yet.</p>
      </article>
    )}

    {!itemLoading && myListings.map((item) => (
      <article className="post-card" key={item._id}>
        {editingItemId === item._id ? (
          <form onSubmit={(event) => saveEditedItem(event, item._id)}
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h3>Edit Listing</h3>
            <input type="text" placeholder="Item name" value={editItemName}
              onChange={(event) => setEditItemName(event.target.value)} required />
            <textarea placeholder="Item description" value={editItemDescription}
              onChange={(event) => setEditItemDescription(event.target.value)} rows={4} required />
            <label>Category
              <select value={editItemCategory} onChange={(event) => setEditItemCategory(event.target.value)}>
                <option value="Books">Books</option>
                <option value="Electronics">Electronics</option>
                <option value="Clothing">Clothing</option>
                <option value="Accessories">Accessories</option>
                <option value="Other">Other</option>
              </select>
            </label>
            <label>Listing Type
              <select value={editListingType} onChange={(event) => setEditListingType(event.target.value)}>
                <option value="Give Away">Give Away (Free)</option>
                <option value="Exchange">Exchange</option>
                <option value="Rent">Rent</option>
              </select>
            </label>
            {editListingType === 'Rent' && (
              <input type="number" min="1" placeholder="Rental price" value={editRentalPrice}
                onChange={(event) => setEditRentalPrice(event.target.value)} required />
            )}
            {editListingType === 'Exchange' && (
              <input type="text" placeholder="What do you want in exchange?" value={editExchangePreference}
                onChange={(event) => setEditExchangePreference(event.target.value)} required />
            )}
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="submit" disabled={itemLoading}>{itemLoading ? 'Saving...' : 'Save Changes'}</button>
              <button type="button" onClick={cancelEditingItem} disabled={itemLoading}>Cancel</button>
            </div>
          </form>
        ) : (
          <>
            <h3>{item.itemName}</h3>
            <p>{item.description}</p>
            <p><strong>Category:</strong> {item.category}</p>
            <p><strong>Type:</strong> {item.listingType}</p>
            {item.listingType === 'Rent' && <p><strong>Rental Price:</strong> ₹{item.rentalPrice}</p>}
            {item.listingType === 'Exchange' && <p><strong>Exchange Preference:</strong> {item.exchangePreference}</p>}
            <p><strong>Status:</strong> {item.status || 'Available'}</p>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '12px' }}>
              <button type="button" onClick={() => startEditingItem(item)} disabled={itemLoading}>Edit</button>
              <button type="button" onClick={() => deleteItem(item._id)} disabled={itemLoading}>Delete</button>
            </div>
          </>
        )}
      </article>
    ))}
  </section>
)}
{activeNav === 'My Requests' && (
  <section>
    <h2>My Requests</h2>
    <p>Items you have requested from other students.</p>

    <button type="button" onClick={loadMyRequests} disabled={itemLoading}>
      {itemLoading ? 'Loading...' : 'Refresh My Requests'}
    </button>

    {itemLoading && <p>Loading your requests...</p>}

    {!itemLoading && myRequests.length === 0 && (
      <article className="post-card">
        <p>You have not sent any item requests yet.</p>
      </article>
    )}

    {!itemLoading && myRequests.map((request) => (
      <article className="post-card" key={request._id}>
        <h3>{request.item?.itemName || 'Item details unavailable'}</h3>
        <p>{request.item?.description || ''}</p>
        <p><strong>Owner:</strong> {request.owner?.name || 'Name unavailable'}</p>
        <p><strong>Listing Type:</strong> {request.item?.listingType || 'Not available'}</p>
        <p><strong>Request Message:</strong> {request.message || 'No message'}</p>
        <p><strong>Request Status:</strong> {request.status || 'Pending'}</p>
        <p>
          <strong>Requested On:</strong>{' '}
          {request.createdAt
            ? new Date(request.createdAt).toLocaleDateString()
            : 'Not available'}
        </p>
      </article>
    ))}
  </section>
)}

{activeNav === 'Requests Received' && (
  <section>
    <h2>Requests Received</h2>
    <p>Students who have requested your items.</p>

    <button type="button" onClick={loadReceivedRequests} disabled={itemLoading}>
      {itemLoading ? 'Loading...' : 'Refresh Requests'}
    </button>

    {itemLoading && <p>Loading received requests...</p>}

    {!itemLoading && receivedRequests.length === 0 && (
      <article className="post-card">
        <p>You have not received any item requests yet.</p>
      </article>
    )}

    {!itemLoading && receivedRequests.map((request) => (
      <article className="post-card" key={request._id}>
        <h3>{request.item?.itemName || 'Item details unavailable'}</h3>
        <p><strong>Requested by:</strong> {request.requester?.name || 'Name unavailable'}</p>
        <p><strong>Email:</strong> {request.requester?.email || 'Not available'}</p>
        <p><strong>Message:</strong> {request.message || 'No message'}</p>
        <p><strong>Status:</strong> {request.status || 'Pending'}</p>

        {request.status === 'Pending' && (
          <>
            <button
              type="button"
              onClick={() => updateItemRequestStatus(request._id, 'Accepted')}
            >
              Accept
            </button>

            <button
              type="button"
              onClick={() => updateItemRequestStatus(request._id, 'Rejected')}
            >
              Reject
            </button>
          </>
        )}
      </article>
    ))}
  </section>
)}
         {activeNav === 'Add Item' && (
  <section
    className="post-card"
    style={{
      padding: '24px',
      maxWidth: '600px',
      margin: '0 auto',
    }}
  >
    <h2>Add an Item</h2>
    <p>List an item for free, exchange, or rent.</p>

    <form
      onSubmit={createItem}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      <input
        type="text"
        placeholder="Item name"
        value={itemName}
        onChange={(event) => setItemName(event.target.value)}
        required
      />

      <textarea
        placeholder="Describe your item"
        value={itemDescription}
        onChange={(event) => setItemDescription(event.target.value)}
        rows={4}
        required
        style={{
          width: '100%',
          boxSizing: 'border-box',
        }}
      />

      <div>
        <label
          htmlFor="item-category"
          style={{ display: 'block', marginBottom: '6px' }}
        >
          Category
        </label>

        <select
          id="item-category"
          value={itemCategory}
          onChange={(event) => setItemCategory(event.target.value)}
          style={{ width: '100%' }}
        >
          <option value="Books">Books</option>
          <option value="Electronics">Electronics</option>
          <option value="Clothing">Clothing</option>
          <option value="Accessories">Accessories</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label
          htmlFor="listing-type"
          style={{ display: 'block', marginBottom: '6px' }}
        >
          Listing Type
        </label>

        <select
          id="listing-type"
          value={listingType}
          onChange={(event) => setListingType(event.target.value)}
          style={{ width: '100%' }}
        >
          <option value="Give Away">Give Away (Free)</option>
          <option value="Exchange">Exchange</option>
          <option value="Rent">Rent</option>
        </select>
      </div>

      {listingType === 'Rent' && (
        <input
          type="number"
          placeholder="Rental price"
          min="1"
          value={rentalPrice}
          onChange={(event) => setRentalPrice(event.target.value)}
          required
        />
      )}
{listingType === 'Exchange' && (
  <input
    type="text"
    placeholder="What do you want in exchange?"
    value={exchangePreference}
    onChange={(event) => setExchangePreference(event.target.value)}
    required
  />
)}

<button type="submit" disabled={itemLoading}>
  {itemLoading ? 'Adding Item...' : 'Add Item'}
</button>
</form>
</section>
)}
    
          {activeNav === 'Feed' && (
            <>
              <section className="create-post">
                <h2>Share with your campus</h2>

                <form onSubmit={publishPost}>
                  <textarea
                    placeholder="What's happening on campus?"
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    rows={4}
                    required
                  />

                  <button type="submit" disabled={loading}>
                    {loading ? 'Posting...' : 'Create Post'}
                  </button>
                </form>
              </section>

              <section className="posts">
                {visiblePosts.map((post) => (
                  <article className="post-card" key={post.id}>
                    <div className="post-header">
                      <Avatar initials={post.initials} color={post.color} />
                      <div>
                        <strong>{post.name}</strong>
                        <p>
                          {post.course} · {post.time}
                        </p>
                      </div>
                    </div>

                    <p className="post-text">{post.text}</p>
                    <p className="post-tag">{post.tag}</p>

                    <div className="post-actions">
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => toggleLike(post.id)}
                      >
                        {liked.includes(post.id) ? '❤️' : '🤍'} {post.likes}{' '}
                        Likes
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setCommenting(
                            commenting === post.id ? null : post.id
                          )
                        }
                      >
                        💬 {post.comments.length} Comments
                      </button>
                    </div>

                    {post.comments.map((comment, index) => (
                      <p
                        className="comment"
                        key={comment.id || `${post.id}-${index}`}
                      >
                        <strong>{comment.user}:</strong> {comment.text}
                      </p>
                    ))}

                    {commenting === post.id && (
                      <form
                        onSubmit={(event) => {
                          event.preventDefault()
                          addComment(post.id)
                        }}
                      >
                        <input
                          placeholder="Write a comment..."
                          value={commentText}
                          onChange={(event) =>
                            setCommentText(event.target.value)
                          }
                          required
                        />

                        <button type="submit" disabled={loading}>
                          {loading ? 'Saving...' : 'Comment'}
                        </button>
                      </form>
                    )}
                  </article>
                ))}

                {visiblePosts.length === 0 && (
                  <p>No matching posts found.</p>
                )}
              </section>
            </>
          )}

          {activeNav === 'Find Students' && (
            <section className="post-card" style={{ padding: '24px' }}>
              <h2>Find Students</h2>
              <p>Search for students by their name or email address.</p>

              <form
                onSubmit={searchUsers}
                style={{
                  display: 'flex',
                  gap: '10px',
                  flexWrap: 'wrap',
                  marginBottom: '20px',
                }}
              >
                <input
                  type="search"
                  placeholder="Enter student name or email..."
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  style={{
                    flex: '1',
                    minWidth: '220px',
                    padding: '12px',
                  }}
                />

                <button type="submit" disabled={usersLoading}>
                  {usersLoading ? 'Searching...' : 'Search'}
                </button>
              </form>

              {usersLoading && <p>Searching for students...</p>}

              {profileLoading && <p>Loading student profile...</p>}

              {selectedProfile && (
                <article
                  className="post-card"
                  style={{ marginBottom: '20px', padding: '20px' }}
                >
                  <h3>Student Profile</h3>
                  <p>
                    <strong>Name:</strong>{' '}
                    {selectedProfile.name || 'Not available'}
                  </p>
                  <p>
                    <strong>Email:</strong>{' '}
                    {selectedProfile.email || 'Not available'}
                  </p>

                  <button
                    type="button"
                    onClick={() => setSelectedProfile(null)}
                  >
                    Close Profile
                  </button>
                </article>
              )}

              {!usersLoading && searchedUsers.length > 0 && (
                <div>
                  {searchedUsers.map((student) => {
                    const studentName =
                      student.name || 'CampusLoop Student'

                    const initials = studentName
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()

                    const studentId = String(student._id)
                    const myId = String(
                      currentUser?.id || currentUser?._id || ''
                    )
                    const isOwnProfile = studentId === myId
                    const isFollowing = followingIds.includes(studentId)

                    return (
                      <article
                        className="post-card"
                        key={student._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '14px',
                          flexWrap: 'wrap',
                          marginBottom: '12px',
                        }}
                      >
                        <Avatar initials={initials || 'CM'} />

                        <div style={{ flex: '1', minWidth: '150px' }}>
                          <strong>{studentName}</strong>
                          <p>{student.email || 'Email not available'}</p>
                        </div>

                        <button
                          type="button"
                          onClick={() => viewStudentProfile(studentId)}
                        >
                          View Profile
                        </button>

                        {!isOwnProfile && (
                          <button
                            type="button"
                            disabled={followBusyId === studentId}
                            onClick={() => toggleFollow(studentId)}
                          >
                            {followBusyId === studentId
                              ? 'Please wait...'
                              : isFollowing
                                ? 'Unfollow'
                                : 'Follow'}
                          </button>
                        )}
                      </article>
                    )
                  })}
                </div>
              )}
            </section>
          )}
                    {activeNav === 'My Profile' && (
            <section
              className="post-card"
              style={{
                padding: '24px',
                maxWidth: '600px',
                margin: '0 auto',
              }}
            >
              <h2>My Profile</h2>
              <p>View and update your CampusLoop account details.</p>

              <div style={{ marginBottom: '20px' }}>
                <Avatar
                  initials={
                    (currentUser?.name || 'CM')
                      .split(' ')
                      .map((part) => part[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()
                  }
                />
              </div>

              <p>
                <strong>Account ID:</strong>{' '}
                {currentUser?._id || currentUser?.id || 'Not available'}
              </p>

              <form onSubmit={saveProfile}>
                <label
                  htmlFor="profileName"
                  style={{ display: 'block', marginBottom: '6px' }}
                >
                  Full Name
                </label>

                <input
                  id="profileName"
                  type="text"
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '16px',
                  }}
                />

                <label
                  htmlFor="profileEmail"
                  style={{ display: 'block', marginBottom: '6px' }}
                >
                  Email Address
                </label>

                <input
                  id="profileEmail"
                  type="email"
                  value={profileEmail}
                  onChange={(event) => setProfileEmail(event.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                  }}
                />

                <button type="submit" disabled={profileSaving}>
                  {profileSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </form>
            </section>
          )}
                    {activeNav === 'Events' && (
            <section>
              <h2>Campus Events</h2>

              {events.map((event) => (
                <article className="post-card" key={event.name}>
                  <h3>{event.name}</h3>
                  <p>
                    {event.day} {event.month} · {event.time}
                  </p>
                  <p>{event.place}</p>
                </article>
              ))}
            </section>
          )}

          {activeNav === 'Trending' && (
            <section>
              <h2>Trending Topics</h2>

              {trends.map(([tag, count]) => (
                <article className="post-card" key={tag}>
                  <strong>{tag}</strong>
                  <p>{count}</p>
                </article>
              ))}
            </section>
          )}

          {activeNav === 'Notifications' && (
            <section className="notifications-section">
              <h2>Notifications</h2>

              <button
                type="button"
                onClick={loadNotifications}
                disabled={notificationsLoading}
              >
                {notificationsLoading ? 'Refreshing...' : 'Refresh'}
              </button>

              {notificationsLoading && <p>Loading notifications...</p>}

              {!notificationsLoading && notifications.length === 0 && (
                <article className="post-card">
                  <p>You're all caught up. No notifications yet.</p>
                  <p>
                    Follow notifications will appear here when someone follows
                    your account.
                  </p>
                </article>
              )}

              {notifications.map((notification) => (
                <article
                  className="post-card"
                  key={notification._id}
                  style={{
                    borderLeft: notification.isRead
                      ? '4px solid #cccccc'
                      : '4px solid #4f46e5',
                  }}
                >
                  <p>
                    <strong>
                      {notification.sender?.name || 'CampusLoop Member'}
                    </strong>
                  </p>

                  <p>{notification.message}</p>

                  <p>
                    {notification.createdAt
                      ? new Date(notification.createdAt).toLocaleString()
                      : ''}
                  </p>

                  <p>{notification.isRead ? 'Read' : 'Unread'}</p>

                  {!notification.isRead && (
                    <button
                      type="button"
                      onClick={() =>
                        markNotificationRead(notification._id)
                      }
                    >
                      Mark as read
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => deleteNotification(notification._id)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </section>
          )}
        </main>

        <aside className="right-sidebar">
          <h3>Trending</h3>

          {trends.map(([tag, count]) => (
            <p key={tag}>
              <strong>{tag}</strong>
              <br />
              {count}
            </p>
          ))}

          <h3>Upcoming Events</h3>

          {events.map((event) => (
            <p key={event.name}>
              <strong>{event.name}</strong>
              <br />
              {event.day} {event.month} · {event.time}
            </p>
          ))}
        </aside>
      </div>
    </div>
  )
}

function App() {
  const currentPath = window.location.pathname

  if (currentPath === '/reset-password') {
    return <ResetPassword />
  }

  return <CampusLoopApp />
}

export default App