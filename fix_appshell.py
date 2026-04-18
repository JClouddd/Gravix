with open("src/components/AppShell.js", "r") as f:
    content = f.read()

# Remove the duplicate NotificationCenter import on line 10
content = content.replace("import NotificationCenter from \"@/components/NotificationCenter\";\n", "")

with open("src/components/AppShell.js", "w") as f:
    f.write(content)
