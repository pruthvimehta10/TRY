
export const courses = [
  {
    id: '1',
    title: 'Web Development Fundamentals',
    description: 'Learn HTML, CSS, and JavaScript from scratch. This comprehensive course covers everything you need to know to start building modern websites.',
    level: 'Beginner',
    instructor_id: 'inst-1',
    thumbnail_url: '/course-web.jpg',
    rating: 4.8,
    total_students: 1250,
  },
  {
    id: '2',
    title: 'Python for Data Science and Machine Learning',
    description: 'Master data analysis, visualization, and machine learning with Python. Perfect for beginners and aspiring data scientists.',
    level: 'Intermediate',
    instructor_id: 'inst-2',
    thumbnail_url: '/course-data.jpg',
    rating: 4.9,
    total_students: 890,
  },
  {
    id: '3',
    title: 'Business Strategy Essentials',
    description: 'Develop critical thinking and strategic planning skills. Learn how to analyze markets and build sustainable business models.',
    level: 'Intermediate',
    instructor_id: 'inst-3',
    thumbnail_url: '/course-business.jpg',
    rating: 4.7,
    total_students: 650,
  },
  {
    id: '4',
    title: 'Advanced React Development',
    description: 'Build scalable applications with modern React patterns. Deep dive into hooks, context, performance optimization, and Next.js.',
    level: 'Advanced',
    instructor_id: 'inst-1',
    thumbnail_url: '/course-react.jpg',
    rating: 4.9,
    total_students: 540,
  },
]

export const lessons = [
  // Course 1 Lessons
  {
    id: 'l1-1',
    course_id: '1',
    title: 'Introduction to HTML',
    description: 'Understanding the basic structure of a web page.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: 12,
    order_index: 0,
    is_published: true,
  },
  {
    id: 'l1-2',
    course_id: '1',
    title: 'CSS Basics',
    description: 'Styling your web pages with CSS.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    duration: 15,
    order_index: 1,
    is_published: true,
  },
  {
    id: 'l1-3',
    course_id: '1',
    title: 'JavaScript Fundamentals',
    description: 'Adding interactivity to your sites.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
    duration: 18,
    order_index: 2,
    is_published: true,
  },
  // Course 2 Lessons
  {
    id: 'l2-1',
    course_id: '2',
    title: 'Python Syntax',
    description: 'Variables, loops, and functions in Python.',
    video_url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
    duration: 14,
    order_index: 0,
    is_published: true,
  },
]

export const questions = [
  // Lesson 1-1 Questions
  {
    id: 'q1-1',
    lesson_id: 'l1-1',
    is_final_exam: false,
    question_text: 'What does HTML stand for?',
    correct_answer: 0,
    order_index: 0,
    options: [
      'Hyper Text Markup Language',
      'High Tech Modern Language',
      'Hyperlink Text Mockup Language',
      'Home Tool Markup Language'
    ]
  },
  {
    id: 'q1-2',
    lesson_id: 'l1-1',
    is_final_exam: false,
    question_text: 'Which tag is used for the largest heading?',
    correct_answer: 1,
    order_index: 1,
    options: [
      '<head>',
      '<h1>',
      '<header>',
      '<h6>'
    ]
  },
  // Lesson 1-2 Questions
  {
    id: 'q1-3',
    lesson_id: 'l1-2',
    is_final_exam: false,
    course_id: '1',
    question_text: 'What does CSS stand for?',
    correct_answer: 2,
    order_index: 0,
    options: [
      'Computer Style Sheets',
      'Creative Style System',
      'Cascading Style Sheets',
      'Colorful Style Sheets'
    ]
  },
  // Final Exam Course 1 (Web Dev)
  {
    id: 'exam-1-1',
    lesson_id: null,
    course_id: '1',
    is_final_exam: true,
    question_text: 'Which HTML element is used to define the title of a document?',
    correct_answer: 1,
    order_index: 0,
    options: [
      '<meta>',
      '<title>',
      '<head>',
      '<header>'
    ]
  },
  {
    id: 'exam-1-2',
    lesson_id: null,
    course_id: '1',
    is_final_exam: true,
    question_text: 'Which property is used to change the background color?',
    correct_answer: 2,
    order_index: 1,
    options: [
      'color',
      'bgcolor',
      'background-color',
      'background'
    ]
  },
  {
    id: 'exam-1-3',
    lesson_id: null,
    course_id: '1',
    is_final_exam: true,
    question_text: 'How do you create a function in JavaScript?',
    correct_answer: 3,
    order_index: 2,
    options: [
      'function:myFunction()',
      'function = myFunction()',
      'create myFunction()',
      'function myFunction()'
    ]
  },
]
