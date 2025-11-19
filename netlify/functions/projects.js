const projects = [
  {
    id: 1,
    name: "Website Redesign",
    status: "in-progress",
    progress: 65,
    deadline: "2024-02-15"
  },
  {
    id: 2, 
    name: "Mobile App Development",
    status: "planning",
    progress: 20,
    deadline: "2024-03-01"
  },
  {
    id: 3,
    name: "API Integration",
    status: "completed", 
    progress: 100,
    deadline: "2024-01-20"
  }
];

exports.handler = async function(event, context) {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(projects)
  };
};
