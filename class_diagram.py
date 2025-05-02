from graphviz import Digraph

# Create a UML Class Diagram
uml = Digraph('EditorService', filename='editor_service_class_diagram', format='png')

# Define classes
uml.node('EditorController', 'EditorController\n+handleRequest(req, res)')
uml.node('EditorRoutes', 'EditorRoutes\n+defineRoutes(app)')
uml.node('ParallaxChartService', 'ParallaxChartService\n+generateParallaxData(data)')
uml.node('UploadService', 'UploadService\n+handleUpload(req, res)')
uml.node('EditorJS', 'Editor.js\n+initializeEditor()')
uml.node('AuthJS', 'Auth.js\n+authenticateUser()')
uml.node('DashboardJS', 'Dashboard.js\n+loadDashboard()')
uml.node('Server', 'server.js\n+startServer()')

# Define relationships
uml.edge('EditorRoutes', 'EditorController', label='uses')
uml.edge('EditorController', 'ParallaxChartService', label='calls')
uml.edge('EditorController', 'UploadService', label='calls')
uml.edge('EditorJS', 'EditorController', label='interacts with API')
uml.edge('AuthJS', 'EditorController', label='authenticates via API')
uml.edge('DashboardJS', 'EditorController', label='retrieves data')
uml.edge('Server', 'EditorRoutes', label='registers')

# Render the UML diagram
uml_path = '/editor_service_class_diagram.png'
uml.render(uml_path, format='png', cleanup=True)

# Display the diagram
import IPython.display as display
display.Image(uml_path)
