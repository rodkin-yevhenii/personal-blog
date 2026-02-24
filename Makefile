# Find and remove all *:Zone.Identifier files.
remove-zone-identifier:
	sudo find . -name "*:Zone.Identifier" -type f -delete
