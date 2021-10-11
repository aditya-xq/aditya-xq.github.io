var ghpages = require('gh-pages');

ghpages.publish(
	'public', // path to public directory
	{
		branch: 'gh-pages',
		repo: 'https://github.com/aditya-xq/aditya-xq.github.io.git', // Update to point to your repository
		user: {
			name: 'aditya-xq', // update to use your name
			email: 'adityavivek1998@gmail.com' // Update to use your email
		},
		dotfiles: true
	},
	() => {
		console.log('Deploy Complete!');
	}
);