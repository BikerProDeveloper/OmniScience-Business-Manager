class OmniPlus {
  constructor() {
    this.paymentManager = new PaymentManager();
    this.projectManager = new ProjectManager();
    this.netlifyManager = new NetlifyManager();
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    document.addEventListener('click', (e) => {
      if (e.target.closest('.payment-method')) {
        this.selectPaymentMethod(e.target.closest('.payment-method'));
      }
    });

    document.addEventListener('submit', (e) => {
      if (e.target.id === 'project-creation-form') {
        e.preventDefault();
        this.createProjectWithRepo(e.target);
      }
    });

    document.addEventListener('click', (e) => {
      if (e.target.id === 'deploy-to-netlify') {
        this.deployToNetlify();
      }
    });
  }

  selectPaymentMethod(element) {
    document.querySelectorAll('.payment-method').forEach(el => {
      el.classList.remove('selected');
    });
    element.classList.add('selected');
  }

  async createProjectWithRepo(form) {
    const formData = new FormData(form);
    const projectData = {
      name: formData.get('project-name'),
      description: formData.get('project-description'),
      isPrivate: formData.get('project-visibility') === 'private'
    };

    try {
      const repo = await this.projectManager.createGitHubRepo(
        projectData.name, 
        projectData.description, 
        projectData.isPrivate
      );

      this.log(\Created GitHub repository: \\);
      
      const netlifySite = await this.projectManager.setupNetlifyDeploy(
        repo.clone_url,
        projectData.name.toLowerCase().replace(/ /g, '-')
      );

      this.log(\Netlify site created: \\);
      
      this.updateProjectWithUrls(projectData.name, repo.url, netlifySite.url);

    } catch (error) {
      this.log(\Project creation failed: \\, 'error');
    }
  }

  async deployToNetlify() {
    try {
      const sites = await this.projectManager.getNetlifySites();
      this.displayNetlifySites(sites);
    } catch (error) {
      this.log(\Netlify deployment failed: \\, 'error');
    }
  }

  displayNetlifySites(sites) {
    const container = document.getElementById('netlify-sites-container');
    if (!container) return;

    container.innerHTML = sites.map(site => \
      <div class=\"glass rounded-2xl p-4 mb-4\">
        <div class=\"flex justify-between items-center\">
          <h4 class=\"font-semibold\">\</h4>
          <span class=\"px-2 py-1 rounded-full text-xs \\">
            \
          </span>
        </div>
        <div class=\"text-xs text-slate-400 mt-2\">
          URL: <a href=\"\\" target=\"_blank\" class=\"underline\">\</a>
        </div>
        <div class=\"mt-3 flex gap-2\">
          <button onclick=\"omniPlus.triggerDeploy('\')\" 
                  class=\"px-3 py-2 rounded-xl bg-brand-500 hover:bg-brand-600 text-sm\">
            Deploy
          </button>
          <a href=\"\\" target=\"_blank\" 
             class=\"px-3 py-2 rounded-xl bg-white/10 border border-white/10 text-sm\">
            Admin
          </a>
        </div>
      </div>
    \).join('');
  }

  async triggerDeploy(siteId) {
    try {
      const deploy = await this.netlifyManager.deploySite(siteId);
      this.log(\Deploy triggered for site \\);
      
      this.monitorDeploy(siteId, deploy.id);
    } catch (error) {
      this.log(\Deploy failed: \\, 'error');
    }
  }

  async monitorDeploy(siteId, deployId) {
    const checkStatus = async () => {
      try {
        const deploys = await this.netlifyManager.getSiteDeploys(siteId);
        const currentDeploy = deploys.find(d => d.id === deployId);
        
        if (currentDeploy) {
          this.updateDeployStatus(currentDeploy.state);
          
          if (currentDeploy.state !== 'ready' && currentDeploy.state !== 'error') {
            setTimeout(checkStatus, 5000);
          }
        }
      } catch (error) {
        this.log(\Deploy monitoring error: \\, 'error');
      }
    };
    
    checkStatus();
  }

  updateDeployStatus(status) {
    const statusElement = document.getElementById('deploy-status');
    if (statusElement) {
      statusElement.textContent = \Deploy status: \\;
      statusElement.className = \	ext-sm \\;
    }
  }

  log(message, level = 'info') {
    const logs = document.getElementById('logs');
    if (logs) {
      const timestamp = new Date().toLocaleString();
      const levelClass = level === 'error' ? 'text-red-300' : level === 'warn' ? 'text-yellow-300' : 'text-slate-300';
      
      logs.innerHTML = \<span class=\"\\">[\] \</span><br>\ + logs.innerHTML;
    }
    console[level](\[OmniPlus] \\);
  }

  updateProjectWithUrls(projectName, repoUrl, netlifyUrl) {
    if (window.state && window.state.projects) {
      const project = window.state.projects.find(p => p.name === projectName);
      if (project) {
        project.repo = repoUrl;
        project.site = netlifyUrl;
        project.netlify = \https://app.netlify.com/sites/\\;
        
        if (window.saveState) {
          window.saveState();
          window.renderProjects();
        }
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.omniPlus = new OmniPlus();
});

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { OmniPlus, PaymentManager, ProjectManager, NetlifyManager };
}
